import { describe, expect, it } from "vitest";
import {
  generateCandidate,
  judgeCandidatePair,
} from "../../src/adapters/anthropic-client.js";

const task = {
  id: "fact-01",
  category: "factual_qa",
  passage: "Aster was founded in 1998.",
  instruction: "When was Aster founded?",
  referenceChecklist: ["States 1998."],
};

const trial = {
  customId: "trial-000001",
  kind: "repeatability",
  taskId: "fact-01",
  promptVersion: "anchored",
  presentationOrder: "canonical",
};

const candidateA = {
  id: "fact-01-a",
  taskId: "fact-01",
  text: "Aster was founded in 1998.",
  model: "claude-haiku-4-5-20251001",
};

const candidateB = {
  id: "fact-01-b",
  taskId: "fact-01",
  text: "Aster was founded in 2001.",
  model: "claude-haiku-4-5-20251001",
};

const structuredOutput = {
  candidate_a: {
    correctness: 2,
    relevance: 2,
    completeness: 2,
    unsupported_claims: false,
  },
  candidate_b: {
    correctness: 0,
    relevance: 2,
    completeness: 2,
    unsupported_claims: true,
  },
  declared_preference: "a",
  explanation: "Candidate A matches the source passage.",
};

describe("Anthropic client adapter", () => {
  it("turns a parsed structured response into a judgment record", async () => {
    const calls = [];
    const client = {
      messages: {
        parse: async (params) => {
          calls.push(params);
          return {
            parsed_output: structuredOutput,
            stop_reason: "end_turn",
            usage: { input_tokens: 100, output_tokens: 80 },
          };
        },
      },
    };

    const judgment = await judgeCandidatePair({ client, task, candidateA, candidateB, trial });

    expect(calls).toHaveLength(1);
    expect(judgment).toMatchObject({
      trialId: "trial-000001",
      taskId: "fact-01",
      candidateAId: "fact-01-a",
      candidateBId: "fact-01-b",
      declaredPreference: "a",
      ruleDerivedPreference: "a",
      status: "completed",
      usage: { inputTokens: 100, outputTokens: 80 },
    });
    expect(judgment.candidateB.unsupportedClaims).toBe(true);
  });

  it("rejects a response without parsed structured output", async () => {
    const client = { messages: { parse: async () => ({ stop_reason: "end_turn" }) } };

    await expect(judgeCandidatePair({ client, task, candidateA, candidateB, trial }))
      .rejects.toThrow(/parsed structured output/i);
  });

  it("normalizes a generated text response into a candidate", async () => {
    const client = {
      messages: {
        create: async () => ({
          content: [{ type: "text", text: "Aster was founded in 1998." }],
          stop_reason: "end_turn",
          usage: { input_tokens: 30, output_tokens: 10 },
        }),
      },
    };

    const result = await generateCandidate({
      client,
      task,
      candidateId: "fact-01-a",
      generationIndex: 0,
    });

    expect(result.candidate).toEqual({
      id: "fact-01-a",
      taskId: "fact-01",
      text: "Aster was founded in 1998.",
      model: "claude-haiku-4-5-20251001",
      generationTemperature: 0.7,
    });
    expect(result.usage).toEqual({
      inputTokens: 30,
      outputTokens: 10,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
    });
  });
});
