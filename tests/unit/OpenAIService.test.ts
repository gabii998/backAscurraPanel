const filesCreate = jest.fn().mockResolvedValue({ id: "file-input-1" });
const filesRetrieve = jest.fn().mockResolvedValue({ status: "processed" });
const batchesCreate = jest.fn().mockResolvedValue({ id: "batch-1" });
const batchesRetrieve = jest.fn();
const filesContent = jest.fn();

jest.mock("openai", () =>
  jest.fn().mockImplementation(() => ({
    files:   { create: filesCreate, content: filesContent, retrieve: filesRetrieve },
    batches: { create: batchesCreate, retrieve: batchesRetrieve },
  })),
);

import { OpenAIService } from "../../src/infrastructure/services/OpenAIService";

async function submittedLines(): Promise<Array<Record<string, any>>> {
  const [{ file }] = filesCreate.mock.calls[filesCreate.mock.calls.length - 1];
  const jsonl = await file.text();
  return jsonl.split("\n").filter(Boolean).map((line: string) => JSON.parse(line));
}

describe("OpenAIService", () => {
  const service = new OpenAIService("test-key", "gpt-4o-mini");

  describe("submitBatch response_format handling", () => {
    // Per https://developers.openai.com/api/docs/guides/structured-outputs:
    // "You must explicitly prompt the model to generate JSON in the system or user message"
    // when response_format is json_object, otherwise OpenAI rejects every line of the batch
    // with an invalid_request_error. response_format must therefore be opt-in per request,
    // not forced globally on every batch line.

    it("omits response_format entirely when the request does not opt into JSON mode (plain-text prompts, e.g. brand synthesis)", async () => {
      await service.submitBatch([{
        customId: "synthesis-brand-1",
        systemPrompt: "Analizá los siguientes posts... SOLO el texto de los patrones, sin listas markdown ni encabezados.",
        userPrompt: "Posts APROBADOS:\n- ...",
      }]);

      const [line] = await submittedLines();
      expect(line.body.response_format).toBeUndefined();
    });

    it("sets response_format to json_object only when the request explicitly opts in with responseFormat: 'json'", async () => {
      await service.submitBatch([{
        customId: "post-0",
        systemPrompt: "Generá un post. Devolvé SOLO JSON válido.",
        userPrompt: "Tema: verano",
        responseFormat: "json",
      }]);

      const [line] = await submittedLines();
      expect(line.body.response_format).toEqual({ type: "json_object" });
    });

    it("applies the flag independently per line within the same batch", async () => {
      await service.submitBatch([
        { customId: "text-request", systemPrompt: "s1", userPrompt: "u1" },
        { customId: "json-request", systemPrompt: "s2 JSON", userPrompt: "u2", responseFormat: "json" },
      ]);

      const [textLine, jsonLine] = await submittedLines();
      expect(textLine.custom_id).toBe("text-request");
      expect(textLine.body.response_format).toBeUndefined();
      expect(jsonLine.custom_id).toBe("json-request");
      expect(jsonLine.body.response_format).toEqual({ type: "json_object" });
    });

    it("builds each line with the batch request shape documented by OpenAI (custom_id, method, url, body.messages)", async () => {
      await service.submitBatch([{ customId: "a", systemPrompt: "sys", userPrompt: "user" }]);

      const [line] = await submittedLines();
      expect(line).toMatchObject({
        custom_id: "a",
        method: "POST",
        url: "/v1/chat/completions",
      });
      expect(line.body.messages).toEqual([
        { role: "system", content: "sys" },
        { role: "user", content: "user" },
      ]);
    });
  });

  describe("submitBatch image URL normalization", () => {
    // Reproduces a real production failure: a handful of IgExamplePost rows were persisted
    // with an imageUrl missing its scheme (e.g. "instabucket.ascurra-soluciones.com/..."
    // instead of "https://instabucket...."), and OpenAI's batch API rejected every one of
    // them with "Failed to download file. File URL is invalid." instead of a normal
    // per-line error — so every retry kept failing the exact same way forever.
    it("prefixes https:// onto an imageUrl that's missing its scheme", async () => {
      await service.submitBatch([{
        customId: "example-summary-1",
        systemPrompt: "Analizá esta imagen. Respondé SOLO JSON.",
        userPrompt: "Generá una ficha de estilo.",
        imageUrl: "instabucket.ascurra-soluciones.com/instagram/brand-1/references/example-1/image.webp",
        responseFormat: "json",
      }]);

      const [line] = await submittedLines();
      expect(line.body.messages[1].content[1].image_url.url).toBe(
        "https://instabucket.ascurra-soluciones.com/instagram/brand-1/references/example-1/image.webp",
      );
    });

    it("leaves an imageUrl that already has a scheme untouched", async () => {
      await service.submitBatch([{
        customId: "example-summary-2",
        systemPrompt: "s",
        userPrompt: "u",
        imageUrl: "https://instabucket.ascurra-soluciones.com/instagram/brand-1/references/example-2/image.webp",
      }]);

      const [line] = await submittedLines();
      expect(line.body.messages[1].content[1].image_url.url).toBe(
        "https://instabucket.ascurra-soluciones.com/instagram/brand-1/references/example-2/image.webp",
      );
    });
  });

  describe("submitBatch waits for the uploaded file to leave status 'uploaded'", () => {
    // A freshly uploaded file starts as status "uploaded" and OpenAI processes it
    // asynchronously; batches.create can fail to find it while it's still in that state.
    // This reproduces the real production failure and its fix: poll files.retrieve until
    // the file leaves "uploaded" (either "processed" or "error") before referencing it.
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
      // clearMocks only clears call history, not implementations set via mockResolvedValue —
      // restore the shared mock's default so later tests aren't stuck polling forever.
      filesRetrieve.mockResolvedValue({ status: "processed" });
    });

    it("creates the batch immediately when the file is already processed", async () => {
      filesRetrieve.mockResolvedValue({ status: "processed" });

      await service.submitBatch([{ customId: "a", systemPrompt: "s", userPrompt: "u" }]);

      expect(filesRetrieve).toHaveBeenCalledTimes(1);
      expect(batchesCreate).toHaveBeenCalledTimes(1);
    });

    it("polls until the file transitions out of 'uploaded' before creating the batch", async () => {
      filesRetrieve
        .mockResolvedValueOnce({ status: "uploaded" })
        .mockResolvedValueOnce({ status: "uploaded" })
        .mockResolvedValueOnce({ status: "processed" });

      const promise = service.submitBatch([{ customId: "a", systemPrompt: "s", userPrompt: "u" }]);
      await jest.advanceTimersByTimeAsync(500);
      await jest.advanceTimersByTimeAsync(1000);
      await promise;

      expect(filesRetrieve).toHaveBeenCalledTimes(3);
      expect(batchesCreate).toHaveBeenCalledTimes(1);
    });

    it("gives up polling after the max attempts and still tries to create the batch", async () => {
      filesRetrieve.mockResolvedValue({ status: "uploaded" });

      const promise = service.submitBatch([{ customId: "a", systemPrompt: "s", userPrompt: "u" }]);
      await jest.advanceTimersByTimeAsync(500);
      await jest.advanceTimersByTimeAsync(1000);
      await jest.advanceTimersByTimeAsync(2000);
      await jest.advanceTimersByTimeAsync(2000);
      await jest.advanceTimersByTimeAsync(2000);
      await promise;

      expect(filesRetrieve).toHaveBeenCalledTimes(5);
      expect(batchesCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe("submitBatch retry on batches.create failure", () => {
    // OpenAI's Batch API can reject `batches.create` right after `files.create` succeeds
    // (observed as "Cannot find file ..., or organization ... does not have access to it").
    // A short backoff retry covers the case where this is transient (e.g. platform-side
    // propagation delay) rather than a real permissions issue.
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
      // clearMocks only clears call history, not implementations set via mockRejectedValue —
      // restore the shared mock's default so later tests don't inherit a permanent rejection.
      batchesCreate.mockResolvedValue({ id: "batch-1" });
    });

    it("retries batches.create with backoff and succeeds once OpenAI accepts it", async () => {
      batchesCreate
        .mockRejectedValueOnce(new Error("Cannot find file file-abc123, or organization org-xyz does not have access to it."))
        .mockResolvedValueOnce({ id: "batch-retried" });

      const promise = service.submitBatch([{ customId: "a", systemPrompt: "s", userPrompt: "u" }]);
      await jest.advanceTimersByTimeAsync(1000);

      await expect(promise).resolves.toBe("batch-retried");
      expect(batchesCreate).toHaveBeenCalledTimes(2);
    });

    it("propagates the error after exhausting all retry attempts", async () => {
      batchesCreate.mockRejectedValue(new Error("Cannot find file file-abc123, or organization org-xyz does not have access to it."));

      const promise = service.submitBatch([{ customId: "a", systemPrompt: "s", userPrompt: "u" }]);
      const assertion = expect(promise).rejects.toThrow("Cannot find file");
      await jest.advanceTimersByTimeAsync(1000);
      await jest.advanceTimersByTimeAsync(2000);
      await jest.advanceTimersByTimeAsync(4000);
      await assertion;

      expect(batchesCreate).toHaveBeenCalledTimes(4);
    });
  });

  describe("getBatchStatus", () => {
    // Per https://developers.openai.com/api/reference/resources/batches/methods/retrieve, a completed
    // batch carries BOTH output_file_id (successful lines) and error_file_id (per-line failures) —
    // these are two separate files that must both be surfaced to callers.
    it("surfaces both output_file_id and error_file_id from the batch object", async () => {
      batchesRetrieve.mockResolvedValue({
        status: "completed",
        output_file_id: "file-cvaTdG",
        error_file_id: "file-HOWS94",
      });

      const result = await service.getBatchStatus("batch-1");

      expect(result).toEqual({ status: "completed", outputFileId: "file-cvaTdG", errorFileId: "file-HOWS94" });
    });

    it("returns undefined file ids when OpenAI hasn't produced them yet (e.g. status: validating)", async () => {
      batchesRetrieve.mockResolvedValue({ status: "validating", output_file_id: null, error_file_id: null });

      const result = await service.getBatchStatus("batch-1");

      expect(result).toEqual({ status: "validating", outputFileId: undefined, errorFileId: undefined });
    });

    // Per https://developers.openai.com/api/reference/resources/batches/methods/retrieve, a batch that
    // fails validation carries an `errors.data[]` array with the real reason (code/message/line/param).
    it("joins batch.errors.data into a human-readable errorDetail when validation fails", async () => {
      batchesRetrieve.mockResolvedValue({
        status: "failed",
        output_file_id: null,
        error_file_id: null,
        errors: {
          object: "list",
          data: [
            { code: "invalid_request", message: "Cannot find file file-abc123, or organization org-xyz does not have access to it.", line: null, param: null },
          ],
        },
      });

      const result = await service.getBatchStatus("batch-1");

      expect(result.errorDetail).toBe("invalid_request: Cannot find file file-abc123, or organization org-xyz does not have access to it.");
    });

    it("leaves errorDetail undefined when batch.errors is absent or empty", async () => {
      batchesRetrieve.mockResolvedValue({ status: "completed", output_file_id: "file-1", error_file_id: null, errors: null });

      const result = await service.getBatchStatus("batch-1");

      expect(result.errorDetail).toBeUndefined();
    });

    // Reproduces a real production failure: batches.create() succeeds synchronously, but the
    // batch later transitions to "failed" during OpenAI's async validation with a "Cannot find
    // file" error, even though the file was uploaded successfully. Since the file itself is
    // fine, recreate the batch against the same input_file_id instead of giving up.
    describe("auto-retry on a 'cannot find file' validation failure", () => {
      const cannotFindFileErrors = {
        object: "list" as const,
        data: [{ code: "invalid_request", message: "Cannot find file file-abc123, or organization org-xyz does not have access to it.", line: null, param: null }],
      };

      it("recreates the batch against the same input_file_id and returns retriedBatchId", async () => {
        batchesRetrieve.mockResolvedValue({
          status: "failed",
          output_file_id: null,
          error_file_id: null,
          input_file_id: "file-abc123",
          metadata: null,
          errors: cannotFindFileErrors,
        });
        batchesCreate.mockResolvedValue({ id: "batch-retry-1", status: "validating", output_file_id: null, error_file_id: null });

        const result = await service.getBatchStatus("batch-1");

        expect(batchesCreate).toHaveBeenCalledWith({
          input_file_id: "file-abc123",
          endpoint: "/v1/chat/completions",
          completion_window: "24h",
          metadata: { retryCount: "1" },
        });
        expect(result).toEqual({ status: "validating", outputFileId: undefined, errorFileId: undefined, retriedBatchId: "batch-retry-1" });
      });

      it("stops auto-retrying once metadata.retryCount reaches the cap and surfaces the real failure", async () => {
        batchesRetrieve.mockResolvedValue({
          status: "failed",
          output_file_id: null,
          error_file_id: null,
          input_file_id: "file-abc123",
          metadata: { retryCount: "100" },
          errors: cannotFindFileErrors,
        });

        const result = await service.getBatchStatus("batch-1");

        expect(batchesCreate).not.toHaveBeenCalled();
        expect(result.status).toBe("failed");
        expect(result.retriedBatchId).toBeUndefined();
        expect(result.errorDetail).toContain("Cannot find file");
      });

      it("does not auto-retry when the caller opts out via autoRetryOnFileError: false", async () => {
        batchesRetrieve.mockResolvedValue({
          status: "failed",
          output_file_id: null,
          error_file_id: null,
          input_file_id: "file-abc123",
          metadata: null,
          errors: cannotFindFileErrors,
        });

        const result = await service.getBatchStatus("batch-1", { autoRetryOnFileError: false });

        expect(batchesCreate).not.toHaveBeenCalled();
        expect(result.retriedBatchId).toBeUndefined();
      });
    });
  });

  describe("downloadBatchResults", () => {
    // Fixtures below are taken verbatim (shape-wise) from OpenAI's documented examples at
    // https://developers.openai.com/api/docs/guides/batch ("Example Batch Output JSONL Format"
    // and "Inspect expired batch request error output in JSONL").
    it("parses a successful output-file line", async () => {
      const outputLine = JSON.stringify({
        id: "batch_req_123",
        custom_id: "request-2",
        response: {
          status_code: 200,
          request_id: "req_123",
          body: {
            id: "chatcmpl-123",
            choices: [{ index: 0, message: { role: "assistant", content: "Hello." }, finish_reason: "stop" }],
            usage: { prompt_tokens: 22, completion_tokens: 2, total_tokens: 24 },
          },
        },
        error: null,
      });
      filesContent.mockResolvedValue({ text: async () => outputLine });

      const [result] = await service.downloadBatchResults("file-cvaTdG");

      expect(result).toEqual({
        customId: "request-2",
        content: "Hello.",
        error: undefined,
        usage: { promptTokens: 22, completionTokens: 2, totalTokens: 24 },
      });
    });

    it("collapses a model's over-escaped \\n back to a single escape so downstream JSON.parse decodes a real newline", async () => {
      // Reproduces a real production bug: the model sometimes double-escapes newlines inside
      // the JSON string it returns (writing \\n instead of \n) — valid JSON, but it decodes to
      // a literal backslash+n instead of an actual newline, corrupting captions and templateHtml.
      const outputLine = JSON.stringify({
        id: "batch_req_123",
        custom_id: "post-0",
        response: {
          status_code: 200,
          request_id: "req_123",
          body: {
            id: "chatcmpl-123",
            choices: [{ index: 0, message: { role: "assistant", content: '{"caption":"Line one.\\\\nLine two."}' }, finish_reason: "stop" }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          },
        },
        error: null,
      });
      filesContent.mockResolvedValue({ text: async () => outputLine });

      const [result] = await service.downloadBatchResults("file-double-escaped");

      const parsed = JSON.parse(result.content) as { caption: string };
      expect(parsed.caption).toBe("Line one.\nLine two.");
    });

    it("parses a per-line error from the error file (e.g. the missing-'json'-keyword validation failure)", async () => {
      const errorLine = JSON.stringify({
        id: "batch_req_123",
        custom_id: "synthesis-brand-1",
        response: null,
        error: {
          code: "invalid_request_error",
          message: "'messages' must contain the word 'json' in some form, to use 'response_format' of type 'json_object'.",
        },
      });
      filesContent.mockResolvedValue({ text: async () => errorLine });

      const [result] = await service.downloadBatchResults("file-HOWS94");

      expect(result.customId).toBe("synthesis-brand-1");
      expect(result.content).toBe("");
      expect(result.error).toContain("json_object");
    });

    it("surfaces a vision-safety refusal (empty content, message.refusal set) as a diagnostic error instead of leaving it opaque", async () => {
      // A refusal is a normal 200-status completion — the batch line carries no top-level
      // or response.body error — but `message.content` is empty and the reason lives in
      // `message.refusal` instead. Previously this surfaced as an unexplained empty result.
      const refusalLine = JSON.stringify({
        id: "batch_req_123",
        custom_id: "example-summary-example-1",
        response: {
          status_code: 200,
          request_id: "req_123",
          body: {
            id: "chatcmpl-123",
            choices: [{ index: 0, message: { role: "assistant", content: null, refusal: "I can't help with that image." }, finish_reason: "stop" }],
          },
        },
        error: null,
      });
      filesContent.mockResolvedValue({ text: async () => refusalLine });

      const [result] = await service.downloadBatchResults("file-refusal");

      expect(result.content).toBe("");
      expect(result.error).toBe("Refusal: I can't help with that image.");
    });

    it("parses OpenAI's documented batch_expired error shape", async () => {
      const expiredLine = JSON.stringify({
        id: "batch_req_123",
        custom_id: "request-3",
        response: null,
        error: { code: "batch_expired", message: "This request could not be executed before the completion window expired." },
      });
      filesContent.mockResolvedValue({ text: async () => expiredLine });

      const [result] = await service.downloadBatchResults("file-err");

      expect(result.customId).toBe("request-3");
      expect(result.error).toBe("This request could not be executed before the completion window expired.");
    });
  });

  describe("submitImageBatch", () => {
    it("routes to /v1/images/generations and omits the image field when there are no reference images", async () => {
      await service.submitImageBatch([{ customId: "post-0", prompt: "Foto de producto" }]);

      const [line] = await submittedLines();
      expect(line).toMatchObject({ custom_id: "post-0", method: "POST", url: "/v1/images/generations" });
      expect(line.body).toMatchObject({ model: "gpt-image-1", prompt: "Foto de producto" });
      expect(line.body.image).toBeUndefined();
      expect(batchesCreate).toHaveBeenCalledWith(expect.objectContaining({ endpoint: "/v1/images/generations" }));
    });

    it("routes to /v1/images/edits and attaches every reference image when references are given", async () => {
      await service.submitImageBatch(
        [{ customId: "post-0", prompt: "Foto de producto con el logo" }],
        ["https://cdn/logo.png", "https://cdn/producto.png"],
      );

      const [line] = await submittedLines();
      expect(line.url).toBe("/v1/images/edits");
      expect(line.body.image).toEqual([
        { image_url: "https://cdn/logo.png" },
        { image_url: "https://cdn/producto.png" },
      ]);
      expect(batchesCreate).toHaveBeenCalledWith(expect.objectContaining({ endpoint: "/v1/images/edits" }));
    });

    it("normalizes a reference image URL that's missing its scheme", async () => {
      await service.submitImageBatch(
        [{ customId: "post-0", prompt: "p" }],
        ["instabucket.ascurra-soluciones.com/instagram/brand-1/logo.png"],
      );

      const [line] = await submittedLines();
      expect(line.body.image[0].image_url).toBe("https://instabucket.ascurra-soluciones.com/instagram/brand-1/logo.png");
    });

    it("submits one line per request within the same image batch", async () => {
      await service.submitImageBatch([
        { customId: "post-0", prompt: "a" },
        { customId: "post-1", prompt: "b" },
      ]);

      const lines = await submittedLines();
      expect(lines.map(l => l.custom_id)).toEqual(["post-0", "post-1"]);
    });
  });

  describe("getBatchStatus auto-retry reuses the failed batch's own endpoint", () => {
    // The auto-retry path in getBatchStatus is shared by both the text batch and the image
    // batch — hardcoding /v1/chat/completions here would silently turn a failed image batch
    // into an invalid chat-completions one on retry.
    it("recreates an image batch against its own endpoint instead of chat completions", async () => {
      batchesRetrieve.mockResolvedValue({
        status: "failed",
        output_file_id: null,
        error_file_id: null,
        input_file_id: "file-abc123",
        endpoint: "/v1/images/edits",
        metadata: null,
        errors: { object: "list", data: [{ code: "invalid_request", message: "Cannot find file file-abc123, or organization org-xyz does not have access to it.", line: null, param: null }] },
      });
      batchesCreate.mockResolvedValue({ id: "batch-retry-1", status: "validating", output_file_id: null, error_file_id: null });

      await service.getBatchStatus("batch-1");

      expect(batchesCreate).toHaveBeenCalledWith(expect.objectContaining({ endpoint: "/v1/images/edits" }));
    });
  });

  describe("downloadImageBatchResults", () => {
    it("extracts b64_json from a successful output-file line", async () => {
      const outputLine = JSON.stringify({
        id: "batch_req_123",
        custom_id: "post-0",
        response: { status_code: 200, request_id: "req_123", body: { data: [{ b64_json: "ZmFrZS1wbmc=" }] } },
        error: null,
      });
      filesContent.mockResolvedValue({ text: async () => outputLine });

      const [result] = await service.downloadImageBatchResults("file-out");

      expect(result).toEqual({ customId: "post-0", b64Json: "ZmFrZS1wbmc=", error: undefined });
    });

    it("surfaces a per-line error and leaves b64Json undefined", async () => {
      const errorLine = JSON.stringify({
        id: "batch_req_123",
        custom_id: "post-1",
        response: null,
        error: { code: "content_policy_violation", message: "El pedido viola la política de contenido." },
      });
      filesContent.mockResolvedValue({ text: async () => errorLine });

      const [result] = await service.downloadImageBatchResults("file-err");

      expect(result.customId).toBe("post-1");
      expect(result.b64Json).toBeUndefined();
      expect(result.error).toBe("El pedido viola la política de contenido.");
    });

    it("flags a missing image as an error even when the line itself carries no explicit error", async () => {
      const emptyLine = JSON.stringify({
        id: "batch_req_123",
        custom_id: "post-2",
        response: { status_code: 200, request_id: "req_123", body: { data: [] } },
        error: null,
      });
      filesContent.mockResolvedValue({ text: async () => emptyLine });

      const [result] = await service.downloadImageBatchResults("file-empty");

      expect(result.b64Json).toBeUndefined();
      expect(result.error).toBeDefined();
    });
  });
});
