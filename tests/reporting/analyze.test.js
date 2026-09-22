import { describe, expect, it } from "vitest";
import { analyzeJudgments } from "../../src/reporting/analyze.js";

const humanEvaluations = [
  {
    taskId: "task-01",
    candidateAId: "task-01-a",
    candidateBId: "task-01-b",
    candidateA: { correctness: 2, relevance: 2, completeness: 2, unsupportedClaims: false },
    candidateB: { correctness: 1, relevance: 2, completeness: 1, unsupportedClaims: true },
    preference: "a",
  },
  {
    taskId: "task-02",
    candidateAId: "task-02-a",
    candidateBId: "task-02-b",
    candidateA: { correctness: 1, relevance: 2, completeness: 1, unsupportedClaims: false },
    candidateB: { correctness: 2, relevance: 2, completeness: 2, unsupportedClaims: false },
    preference: "b",
  },
];

const judgment = (overrides = {}) => ({
  trialId: "trial-000001",
  taskId: "task-01",
  kind: "repeatability",
  promptVersion: "baseline",
  presentationOrder: "canonical",
  candidateAId: "task-01-a",
  candidateBId: "task-01-b",
  candidateA: { correctness: 2, relevance: 2, completeness: 2, unsupportedClaims: false },
  candidateB: { correctness: 1, relevance: 2, completeness: 1, unsupportedClaims: true },
  declaredPreference: "a",
  ruleDerivedPreference: "a",
  explanation: "A is supported.",
  status: "completed",
  stopReason: "end_turn",
  usage: { inputTokens: 100, outputTokens: 20, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 },
  ...overrides,
});

describe("judgment analysis", () => {
  it("aligns candidate identity before comparing reversed judgments", () => {
    const summary = analyzeJudgments({
      humanEvaluations,
      judgments: [
        judgment(),
        judgment({
          trialId: "trial-000002",
          taskId: "task-02",
          candidateAId: "task-02-b",
          candidateBId: "task-02-a",
          candidateA: humanEvaluations[1].candidateB,
          candidateB: humanEvaluations[1].candidateA,
          declaredPreference: "a",
          ruleDerivedPreference: "a",
          presentationOrder: "canonical",
        }),
      ],
    });

    expect(summary.totalJudgments).toBe(2);
    expect(summary.completedJudgments).toBe(2);
    expect(summary.failedJudgments).toBe(0);
    expect(summary.byPrompt.baseline.preferenceAgreement).toBe(1);
    expect(summary.byPrompt.baseline.meanAbsoluteError).toEqual({
      correctness: 0,
      relevance: 0,
      completeness: 0,
    });
  });

  it("keeps Haiku and Sonnet metrics in separate side-by-side summaries", () => {
    const summary = analyzeJudgments({
      humanEvaluations,
      judgments: [
        judgment({ judgeModelKey: "haiku" }),
        judgment({ taskId: "task-02", trialId: "trial-000002", judgeModelKey: "sonnet", candidateA: humanEvaluations[1].candidateB, candidateB: humanEvaluations[1].candidateA, candidateAId: "task-02-b", candidateBId: "task-02-a", declaredPreference: "a", ruleDerivedPreference: "a" }),
      ],
    });

    expect(summary.byModel.haiku.model).toBe("claude-haiku-4-5-20251001");
    expect(summary.byModel.sonnet.model).toBe("claude-sonnet-4-6");
    expect(summary.byModel.haiku.byPrompt.baseline.preferenceAgreement).toBe(1);
    expect(summary.byModel.sonnet.byPrompt.baseline.preferenceAgreement).toBe(1);
  });

  it("summarizes repeatability, position changes, and verbosity outcomes", () => {
    const repeated = ["a", "a", "a"].map((preference, index) => judgment({
      trialId: `repeat-${index}`,
      taskId: "task-01",
      declaredPreference: preference,
      ruleDerivedPreference: preference,
    }));
    const summary = analyzeJudgments({
      humanEvaluations,
      judgments: [
        ...repeated,
        judgment({
          trialId: "position-01",
          kind: "position",
          taskId: "task-01",
          candidateAId: "task-01-b",
          candidateBId: "task-01-a",
          declaredPreference: "a",
          ruleDerivedPreference: "a",
          presentationOrder: "reversed",
        }),
        judgment({
          trialId: "verbosity-01",
          kind: "verbosity",
          taskId: "task-01",
          presentationOrder: "short-long",
          declaredPreference: "b",
          ruleDerivedPreference: "b",
        }),
      ],
    });

    expect(summary.biasByPrompt.baseline.repeatability).toBe(1);
    expect(summary.biasByPrompt.baseline.positionChangeRate).toBe(1);
    expect(summary.biasByPrompt.baseline.verbosity.longerWins).toBe(1);
  });

  it("reports failed results without including them in accuracy metrics", () => {
    const summary = analyzeJudgments({
      humanEvaluations,
      judgments: [judgment(), { trialId: "trial-err", taskId: "task-02", status: "failed" }],
    });

    expect(summary.failedJudgments).toBe(1);
    expect(summary.byPrompt.baseline.denominator).toBe(1);
  });
});
