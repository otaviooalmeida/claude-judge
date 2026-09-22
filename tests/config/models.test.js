import { describe, expect, it } from "vitest";
import {
  DEFAULT_JUDGE_MODEL_KEY,
  getJudgeModel,
  JUDGE_MODELS,
} from "../../src/config/models.js";

describe("judge model configuration", () => {
  it("keeps Haiku as the candidate generator and default judge", () => {
    expect(DEFAULT_JUDGE_MODEL_KEY).toBe("haiku");
    expect(getJudgeModel("haiku")).toMatchObject({
      key: "haiku",
      model: "claude-haiku-4-5-20251001",
      batchPricing: { inputUsdPerMillion: 0.5, outputUsdPerMillion: 2.5 },
    });
  });

  it("defines Sonnet as a separately priced judge model", () => {
    expect(getJudgeModel("sonnet")).toMatchObject({
      key: "sonnet",
      model: "claude-sonnet-4-6",
      batchPricing: { inputUsdPerMillion: 1.5, outputUsdPerMillion: 7.5 },
    });
    expect(Object.keys(JUDGE_MODELS)).toEqual(["haiku", "sonnet"]);
  });

  it("rejects unknown model keys", () => {
    expect(() => getJudgeModel("opus")).toThrow(/unknown judge model/i);
  });
});
