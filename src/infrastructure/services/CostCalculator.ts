// Batch API rates (50% discount already applied), USD per token
const BATCH_RATES: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.075 / 1_000_000, output: 0.300 / 1_000_000 },
  "gpt-4o":      { input: 1.25  / 1_000_000, output: 5.000 / 1_000_000 },
};

export function calculateBatchCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const rate = BATCH_RATES[model] ?? BATCH_RATES["gpt-4o-mini"];
  return inputTokens * rate.input + outputTokens * rate.output;
}

// gpt-image-1 Batch API rate (50% discount applied), USD per generated 1024x1024 image.
// TODO: confirm this figure against OpenAI's current pricing page before trusting it for
// real budget decisions — it has not been verified against a live invoice.
const IMAGE_BATCH_RATE_USD_PER_IMAGE = 0.02;

export function calculateImageBatchCost(imageCount: number): number {
  return imageCount * IMAGE_BATCH_RATE_USD_PER_IMAGE;
}
