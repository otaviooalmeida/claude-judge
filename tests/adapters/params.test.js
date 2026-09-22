import { describe, expect, it } from "vitest";
import {
  buildCandidateGenerationParams,
  buildJudgeParams,
  JUDGE_MODEL,
} from "../../src/adapters/anthropic-params.js";

const task = {
  id: "fact-01",
  category: "factual_qa",
  passage: "Aster was founded in 1998.",
  instruction: "When was Aster founded?",
  referenceChecklist: ["States 1998."],
};

const candidateA = {
  id: "fact-01-a",
  taskId: "fact-01",
  text: "Aster was founded in 1998.",
  model: JUDGE_MODEL,
};

const candidateB = {
  id: "fact-01-b",
  taskId: "fact-01",
  text: "Aster was founded in 2001.",
  model: JUDGE_MODEL,
};

describe("Anthropic request parameters", () => {
  it("builds a structured-output judge request without exposing the reference checklist", () => {
    const params = buildJudgeParams({
      task,
      candidateA,
      candidateB,
      promptVersion: "anchored",
    });

    expect(params.model).toBe(JUDGE_MODEL);
    expect(params.max_tokens).toBe(400);
    expect(params.temperature).toBe(0);
    expect(params.output_config.format.type).toBe("json_schema");
    expect(params.system).toMatch(/correctness/i);
    expect(params.messages[0].content).toContain(candidateA.text);
    expect(params.messages[0].content).toContain(candidateB.text);
    expect(params.messages[0].content).not.toContain(task.referenceChecklist[0]);
  });

  it("selects Sonnet without changing the prompt or output contract", () => {
    const params = buildJudgeParams({ task, candidateA, candidateB, promptVersion: "anchored", modelKey: "sonnet" });

    expect(params.model).toBe("claude-sonnet-4-6");
    expect(params.temperature).toBe(0);
    expect(params.output_config.format.type).toBe("json_schema");
  });

  it("builds two prompt versions with the same model settings", () => {
    const baseline = buildJudgeParams({ task, candidateA, candidateB, promptVersion: "baseline" });
    const anchored = buildJudgeParams({ task, candidateA, candidateB, promptVersion: "anchored" });

    expect(baseline.temperature).toBe(0);
    expect(anchored.temperature).toBe(0);
    expect(baseline.system).not.toBe(anchored.system);
  });

  it("builds a neutral candidate-generation request", () => {
    const params = buildCandidateGenerationParams({ task });

    expect(params.model).toBe(JUDGE_MODEL);
    expect(params.temperature).toBe(0.7);
    expect(params.max_tokens).toBe(300);
    expect(params.messages[0].content).toContain(task.passage);
    expect(params.messages[0].content).toContain(task.instruction);
  });
});
