const filesCreate = jest.fn().mockResolvedValue({ id: "file-input-1" });
const batchesCreate = jest.fn().mockResolvedValue({ id: "batch-1" });
const batchesRetrieve = jest.fn();
const filesContent = jest.fn();

jest.mock("openai", () =>
  jest.fn().mockImplementation(() => ({
    files:   { create: filesCreate, content: filesContent },
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
});
