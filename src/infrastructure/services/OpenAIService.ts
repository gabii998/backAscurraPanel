import OpenAI from "openai";
import type { OpenAIBatchService, BatchRequest, BatchResult } from "../../application/services/OpenAIBatchService";
import { normalizeAssetUrl } from "../utils/normalizeAssetUrl";

// Models occasionally double-escape whitespace inside JSON string values they generate
// (writing \\n instead of \n), which is valid JSON but decodes to a literal backslash+n
// instead of a real newline (observed in production: broke templateHtml and captions).
// Collapse the double escape back to a single one before any caller JSON.parses this text,
// so it decodes to the real character the model actually intended.
function normalizeOverEscapedJson(text: string): string {
  return text.replace(/\\\\([nrt])/g, "\\$1");
}


export class OpenAIService implements OpenAIBatchService {
  private client: OpenAI;

  constructor(apiKey: string, private model: string = "gpt-4o-mini") {
    // organization/project must stay null: the openai SDK otherwise falls back to
    // process.env.OPENAI_ORG_ID / OPENAI_PROJECT_ID, which would pin every brand's
    // client (each with its own apiKey) to a single org/project via request headers,
    // regardless of which org the apiKey actually belongs to.
    this.client = new OpenAI({ apiKey, organization: null, project: null });
  }

  private async waitUntilFileProcessed(fileId: string): Promise<void> {
    const pollDelaysMs = [500, 1000, 2000, 2000, 2000];
    for (const delay of pollDelaysMs) {
      const file = await this.client.files.retrieve(fileId);
      if (file.status !== "uploaded") return;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  async submitBatch(requests: BatchRequest[]): Promise<string> {
    const lines = requests.map(r =>
      JSON.stringify({
        custom_id: r.customId,
        method: "POST",
        url: "/v1/chat/completions",
        body: {
          model: this.model,
          messages: [
            { role: "system", content: r.systemPrompt },
            { role: "user", content: r.imageUrl ? [
              { type: "text", text: r.userPrompt },
              { type: "image_url", image_url: { url: normalizeAssetUrl(r.imageUrl), detail: "low" } },
            ] : r.userPrompt },
          ],
          // No fixed temperature: reasoning-family models (e.g. gpt-5.6-luna, o-series)
          // reject any value other than their default (1) with a per-line batch error,
          // and omitting the param is safe/compatible across every model.
          ...(r.responseFormat === "json" ? { response_format: { type: "json_object" } } : {}),
        },
      }),
    );

    const jsonl = lines.join("\n");
    const blob  = new Blob([jsonl], { type: "application/jsonl" });
    const file  = new File([blob], "batch.jsonl", { type: "application/jsonl" });

    const uploaded = await this.client.files.create({
      file,
      purpose: "batch",
    });

    // A freshly uploaded file starts out as status "uploaded" and OpenAI processes it
    // asynchronously before it becomes visible to the Batch API's validator. Creating the
    // batch while the file is still "uploaded" is what produces the observed production
    // failure ("Cannot find file ..., or organization ... does not have access to it"),
    // even though the file itself was uploaded successfully. Wait for it to leave that
    // state (either "processed" or "error") before referencing it in the batch.
    await this.waitUntilFileProcessed(uploaded.id);

    let batch;
    const retryDelaysMs = [1000, 2000, 4000];
    for (let attempt = 0; ; attempt++) {
      try {
        batch = await this.client.batches.create({
          input_file_id:    uploaded.id,
          endpoint:         "/v1/chat/completions",
          completion_window: "24h",
        });
        break;
      } catch (err) {
        if (attempt >= retryDelaysMs.length) throw err;
        await new Promise(resolve => setTimeout(resolve, retryDelaysMs[attempt]));
      }
    }

    return batch.id;
  }

  async getBatchStatus(batchId: string, options?: { autoRetryOnFileError?: boolean }): Promise<{ status: string; outputFileId?: string; errorFileId?: string; errorDetail?: string; retriedBatchId?: string }> {
    const batch = await this.client.batches.retrieve(batchId);
    const errorDetail = batch.errors?.data?.length
      ? batch.errors.data.map(e => [e.code, e.message].filter(Boolean).join(": ")).join("; ")
      : undefined;

    // OpenAI's Batch API can fail validation right after accepting the batch with
    // "Cannot find file ..., or organization ... does not have access to it" even though
    // the file was uploaded successfully moments earlier (observed in production, and
    // confirmed as a known, still-unresolved OpenAI platform-side outage as of 2026-09
    // https://community.openai.com/t/openai-batch-api-failing-since-19th-august/1393174 —
    // affected users report it can take hours to clear, with no deterministic signal for
    // when a file becomes usable). So recreate the batch against the same already-uploaded
    // file instead of surfacing a hard failure to the caller. Capped via batch metadata (not
    // a DB column) generously (~8h at the 5-minute polling cadence) so the poller keeps
    // quietly retrying through the outage instead of giving up in minutes, while a genuinely
    // permanent failure still surfaces eventually instead of looping forever. Callers that
    // cannot persist the resulting retriedBatchId anywhere (so a re-poll would always hit
    // this same dead batch and retry again unbounded, since batch metadata cannot be updated
    // after creation) must opt out with autoRetryOnFileError: false.
    const autoRetryOnFileError = options?.autoRetryOnFileError ?? true;
    const retryCount = Number(batch.metadata?.retryCount ?? 0);
    if (autoRetryOnFileError && batch.status === "failed" && errorDetail && /cannot find file/i.test(errorDetail) && batch.input_file_id && retryCount < 100) {
      try {
        const retried = await this.client.batches.create({
          input_file_id:      batch.input_file_id,
          endpoint:            "/v1/chat/completions",
          completion_window:   "24h",
          metadata:            { retryCount: String(retryCount + 1) },
        });
        return {
          status:        retried.status,
          outputFileId:  retried.output_file_id ?? undefined,
          errorFileId:   retried.error_file_id ?? undefined,
          retriedBatchId: retried.id,
        };
      } catch {
        // fall through and report the original failure below
      }
    }

    return {
      status:       batch.status,
      outputFileId: batch.output_file_id ?? undefined,
      errorFileId:  batch.error_file_id ?? undefined,
      errorDetail,
    };
  }

  async downloadBatchResults(outputFileId: string): Promise<BatchResult[]> {
    const content = await this.client.files.content(outputFileId);
    const text    = await content.text();
    const results: BatchResult[] = [];

    for (const line of text.split("\n").filter(Boolean)) {
      try {
        const parsed = JSON.parse(line) as {
          custom_id: string;
          response?: {
            body?: {
              choices?: Array<{ message?: { content?: string; refusal?: string } }>;
              usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
              error?: { message: string };
            };
          };
          error?: { message: string };
        };

        const message = parsed.response?.body?.choices?.[0]?.message;
        const content = normalizeOverEscapedJson(message?.content ?? "");
        const rawUsage = parsed.response?.body?.usage;
        results.push({
          customId: parsed.custom_id,
          content,
          // A per-line HTTP-level rejection (e.g. an unsupported request param) lands
          // its message inside response.body.error, not the top-level error field.
          // A vision-safety refusal instead leaves `content` empty and puts its reason in
          // `message.refusal` — surface that too, or a bare empty completion just reads as
          // an opaque "invalid response" downstream with no way to tell why.
          error: parsed.error?.message ?? parsed.response?.body?.error?.message ?? (!content && message?.refusal ? `Refusal: ${message.refusal}` : undefined),
          usage: rawUsage
            ? {
                promptTokens:     rawUsage.prompt_tokens,
                completionTokens: rawUsage.completion_tokens,
                totalTokens:      rawUsage.total_tokens,
              }
            : undefined,
        });
      } catch {
        // skip malformed lines
      }
    }

    return results;
  }
}
