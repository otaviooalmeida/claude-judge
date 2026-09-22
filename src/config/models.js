const definitions = {
  haiku: {
    key: "haiku",
    label: "Claude Haiku 4.5",
    model: "claude-haiku-4-5-20251001",
    batchPricing: { inputUsdPerMillion: 0.5, outputUsdPerMillion: 2.5 },
  },
  sonnet: {
    key: "sonnet",
    label: "Claude Sonnet 4.6",
    model: "claude-sonnet-4-6",
    batchPricing: { inputUsdPerMillion: 1.5, outputUsdPerMillion: 7.5 },
  },
};

export const JUDGE_MODELS = Object.freeze(Object.fromEntries(
  Object.entries(definitions).map(([key, definition]) => [
    key,
    Object.freeze({ ...definition, batchPricing: Object.freeze({ ...definition.batchPricing }) }),
  ]),
));

export const DEFAULT_JUDGE_MODEL_KEY = "haiku";
export const CANDIDATE_GENERATOR_MODELS = Object.freeze({ a: "haiku", b: "sonnet" });

export function getJudgeModel(modelKey = DEFAULT_JUDGE_MODEL_KEY) {
  const model = JUDGE_MODELS[modelKey];
  if (!model) throw new Error(`Unknown judge model: ${modelKey}`);
  return model;
}
