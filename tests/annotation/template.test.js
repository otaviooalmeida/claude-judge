import { describe, expect, it } from "vitest";
import { buildHumanEvaluationTemplate } from "../../src/annotation/template.js";

const tasks = [
  { id: "task-01", split: "evaluation" },
  { id: "task-02", split: "calibration" },
];
const candidates = [
  { id: "task-01-a", taskId: "task-01", text: "A", model: "haiku" },
  { id: "task-01-b", taskId: "task-01", text: "B", model: "haiku" },
];

describe("human label template", () => {
  it("creates blank labels only for complete evaluation candidate pairs", () => {
    expect(buildHumanEvaluationTemplate({ tasks, candidates })).toEqual([{
      taskId: "task-01",
      candidateAId: "task-01-a",
      candidateBId: "task-01-b",
      candidateA: { correctness: null, relevance: null, completeness: null, unsupportedClaims: null },
      candidateB: { correctness: null, relevance: null, completeness: null, unsupportedClaims: null },
      preference: null,
    }]);
  });

  it("fails rather than creating an incomplete annotation set", () => {
    expect(() => buildHumanEvaluationTemplate({
      tasks: [{ id: "task-01", split: "evaluation" }],
      candidates: [candidates[0]],
    })).toThrow(/candidate pair/i);
  });
});
