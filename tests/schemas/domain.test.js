import { describe, expect, it } from "vitest";
import {
  CandidateSchema,
  HumanEvaluationSchema,
  JudgeOutputSchema,
  TaskSchema,
} from "../../src/schemas/domain.js";

const task = {
  id: "fact-01",
  category: "factual_qa",
  passage: "Aster was founded in 1998 and moved its headquarters in 2004.",
  instruction: "When was Aster founded? Answer using only the passage.",
  referenceChecklist: ["States that Aster was founded in 1998."],
};

describe("domain schemas", () => {
  it("accepts a source-grounded task", () => {
    expect(TaskSchema.parse(task)).toEqual({ ...task, split: "evaluation" });
  });

  it("rejects a task with an unknown category or empty checklist", () => {
    expect(() => TaskSchema.parse({ ...task, category: "essay" })).toThrow();
    expect(() => TaskSchema.parse({ ...task, referenceChecklist: [] })).toThrow();
  });

  it("accepts a candidate response", () => {
    const candidate = {
      id: "fact-01-a",
      taskId: "fact-01",
      text: "Aster was founded in 1998.",
      model: "claude-haiku-4-5-20251001",
    };

    expect(CandidateSchema.parse(candidate)).toEqual(candidate);
  });

  it("accepts a complete structured judgment", () => {
    const output = {
      candidate_a: {
        correctness: 2,
        relevance: 2,
        completeness: 2,
        unsupported_claims: false,
      },
      candidate_b: {
        correctness: 1,
        relevance: 2,
        completeness: 1,
        unsupported_claims: false,
      },
      declared_preference: "a",
      explanation: "Candidate A gives the supported founding year directly.",
    };
    expect(JudgeOutputSchema.parse(output)).toEqual(output);
  });

  it("rejects out-of-range scores and missing explanations", () => {
    const output = {
      candidate_a: {
        correctness: 3,
        relevance: 2,
        completeness: 2,
        unsupported_claims: false,
      },
      candidate_b: {
        correctness: 1,
        relevance: 2,
        completeness: 1,
        unsupported_claims: false,
      },
      declared_preference: "a",
    };
    expect(() => JudgeOutputSchema.parse(output)).toThrow();
  });

  it("accepts a human evaluation with the same scorecard vocabulary", () => {
    const evaluation = {
      taskId: "fact-01",
      candidateAId: "fact-01-a",
      candidateBId: "fact-01-b",
      candidateA: {
        correctness: 2,
        relevance: 2,
        completeness: 2,
        unsupportedClaims: false,
      },
      candidateB: {
        correctness: 1,
        relevance: 2,
        completeness: 1,
        unsupportedClaims: false,
      },
      preference: "a",
    };
    expect(HumanEvaluationSchema.parse(evaluation)).toEqual(evaluation);
  });
});
