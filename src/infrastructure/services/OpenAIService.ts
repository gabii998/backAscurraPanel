import OpenAI from "openai";
import type { OpenAIBatchService, BatchRequest, BatchResult } from "../../application/services/OpenAIBatchService";

export class OpenAIService implements OpenAIBatchService {
  private client: OpenAI;

  constructor(apiKey: string, private model: string = "gpt-4o-mini") {
    // organization/project must stay null: the openai SDK otherwise falls back to
    // process.env.OPENAI_ORG_ID / OPENAI_PROJECT_ID, which would pin every brand's
    // client (each with its own apiKey) to a single org/project via request headers,
    // regardless of which org the apiKey actually belongs to.
    this.client = new OpenAI({ apiKey, organization: null, project: null });
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
              { type: "image_url", image_url: { url: r.imageUrl, detail: "low" } },
            ] : r.userPrompt },
          ],
          temperature: 0.8,
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

  async getBatchStatus(batchId: string): Promise<{ status: string; outputFileId?: string; errorFileId?: string; errorDetail?: string }> {
    const batch = await this.client.batches.retrieve(batchId);
    const errorDetail = batch.errors?.data?.length
      ? batch.errors.data.map(e => [e.code, e.message].filter(Boolean).join(": ")).join("; ")
      : undefined;
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
              choices?: Array<{ message?: { content?: string } }>;
              usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
            };
          };
          error?: { message: string };
        };

        const content = parsed.response?.body?.choices?.[0]?.message?.content ?? "";
        const rawUsage = parsed.response?.body?.usage;
        results.push({
          customId: parsed.custom_id,
          content,
          error: parsed.error?.message,
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
