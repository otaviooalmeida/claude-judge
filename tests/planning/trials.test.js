import { describe, expect, it } from "vitest";
import {
  buildJudgeTrialPlan,
  estimateBatchCost,
  assertWithinBudget,
} from "../../src/planning/trials.js";

const prompts = ["baseline", "anchored"];
const naturalPairs = Array.from({ length: 40 }, (_, index) => ({
  pairId: `task-${index + 1}`,
  taskId: `task-${index + 1}`,
  candidateAId: `task-${index + 1}-a`,
  candidateBId: `task-${index + 1}-b`,
}));
const verbosityPairs = Array.from({ length: 20 }, (_, index) => ({
  pairId: `verbosity-${index + 1}`,
  taskId: `verbosity-${index + 1}`,
  shortCandidateId: `verbosity-${index + 1}-short`,
  longCandidateId: `verbosity-${index + 1}-long`,
}));

describe("judge trial planning", () => {
  it("builds the agreed 400-request experiment without duplicate IDs", () => {
    const plan = buildJudgeTrialPlan({ naturalPairs, verbosityPairs, prompts });

    expect(plan).toHaveLength(400);
    expect(plan.filter((trial) => trial.kind === "repeatability")).toHaveLength(240);
    expect(plan.filter((trial) => trial.kind === "position")).toHaveLength(80);
    expect(plan.filter((trial) => trial.kind === "verbosity")).toHaveLength(80);
    expect(new Set(plan.map((trial) => trial.customId)).size).toBe(400);
    expect(plan.every((trial) => /^[a-zA-Z0-9_-]{1,64}$/.test(trial.customId))).toBe(true);
  });

  it("preserves response identity when constructing reversed trials", () => {
    const plan = buildJudgeTrialPlan({
      naturalPairs: [naturalPairs[0]],
      verbosityPairs: [verbosityPairs[0]],
      prompts: ["baseline"],
    });

    const position = plan.find((trial) => trial.kind === "position");
    const verbosityReversed = plan.find(
      (trial) => trial.kind === "verbosity" && trial.presentationOrder === "long-short",
    );

    expect(position.orderedCandidateIds).toEqual(["task-1-b", "task-1-a"]);
    expect(verbosityReversed.orderedCandidateIds).toEqual([
      "verbosity-1-long",
      "verbosity-1-short",
    ]);
  });

  it("estimates batch cost using maximum output allowance", () => {
    expect(
      estimateBatchCost({
        requestCount: 400,
        inputTokensPerRequest: 1200,
        maxOutputTokensPerRequest: 400,
      }),
    ).toBeCloseTo(0.64, 8);

    expect(
      estimateBatchCost({
        requestCount: 400,
        inputTokensPerRequest: 1200,
        maxOutputTokensPerRequest: 400,
        pricing: { inputUsdPerMillion: 1.5, outputUsdPerMillion: 7.5 },
      }),
    ).toBeCloseTo(1.92, 8);
  });

  it("rejects a plan whose conservative estimate exceeds the internal ceiling", () => {
    expect(() => assertWithinBudget(1.01, 1)).toThrow(/budget/i);
    expect(() => assertWithinBudget(1, 1)).not.toThrow();
  });
});
