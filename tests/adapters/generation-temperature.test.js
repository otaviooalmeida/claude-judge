import { describe, expect, it } from "vitest";
import { buildCandidateGenerationParams } from "../../src/adapters/anthropic-params.js";
import { buildCandidateBatchRequests } from "../../src/adapters/generation-batch.js";

const task = {
  id: "fact-01",
  split: "evaluation",
  category: "factual_qa",
  passage: "Aster was founded in 1998.",
  instruction: "When was Aster founded?",
  referenceChecklist: ["States 1998."],
};

describe("candidate generation temperature profiles", () => {
  it("accepts a candidate-specific temperature", () => {
    expect(buildCandidateGenerationParams({ task, temperature: 1 }).temperature).toBe(1);
  });

  it("assigns different temperatures to candidate A and B", () => {
    const requests = buildCandidateBatchRequests({ tasks: [task] });

    expect(requests.map((request) => request.params.temperature)).toEqual([0.7, 0.7]);
    expect(requests.map((request) => request.params.model)).toEqual([
      "claude-haiku-4-5-20251001",
      "claude-sonnet-4-6",
    ]);
  });
});
