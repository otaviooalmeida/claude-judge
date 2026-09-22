import { describe, expect, it } from "vitest";
import { readJsonLines } from "../../src/io/jsonl.js";
import { createOfflinePlan } from "../../src/cli/plan-run.js";
import { TaskSchema } from "../../src/schemas/domain.js";

describe("offline study plan", () => {
  it("keeps the checked-in task set and cost estimate within the agreed gates", async () => {
    const tasks = await readJsonLines("data/tasks/tasks.jsonl", TaskSchema);
    const plan = createOfflinePlan(tasks);

    expect(plan.taskCounts).toEqual({ total: 48, calibration: 8, evaluation: 40, verbosityControls: 20 });
    expect(plan.verbosityTaskIds).toHaveLength(20);
    expect(new Set(plan.verbosityTaskIds.map((id) => id.split("-")[0])).size).toBe(4);
    expect(plan.requestCounts).toMatchObject({
      candidateGeneration: 96,
      mainJudgments: 400,
      calibrationJudgments: 16,
      judgmentsPerModel: 416,
      totalJudgmentsAcrossModels: 832,
    });
    expect(plan.candidateGeneratorModels).toEqual({ a: "haiku", b: "sonnet" });
    expect(plan.requestCounts.candidateGenerationByModel).toEqual({ haiku: 48, sonnet: 48 });
    expect(plan.judgeModels).toHaveProperty("haiku");
    expect(plan.judgeModels).toHaveProperty("sonnet");
    expect(plan.costEstimateUsd.haikuOnly).toBeCloseTo(0.8336, 4);
    expect(plan.costEstimateUsd.comparison).toBeCloseTo(2.8304, 4);
    expect(plan.costEstimateUsd.total).toBeLessThanOrEqual(5);
    expect(plan.paidExecution).toBe("disabled");
  });
});
