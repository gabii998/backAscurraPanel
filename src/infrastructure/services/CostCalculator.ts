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
