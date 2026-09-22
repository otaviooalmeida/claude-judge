import { describe, expect, it } from "vitest";
import { readJudgeBatchResults } from "../../src/adapters/batch-results.js";

const trial = {
  customId: "trial-000001",
  kind: "repeatability",
  taskId: "fact-01",
  promptVersion: "baseline",
  presentationOrder: "canonical",
  orderedCandidateIds: ["fact-01-a", "fact-01-b"],
};
const task = {
  id: "fact-01",
  category: "factual_qa",
  passage: "Aster was founded in 1998.",
  instruction: "When was Aster founded?",
  referenceChecklist: ["States 1998."],
};
const candidates = [
  { id: "fact-01-a", taskId: "fact-01", text: "1998.", model: "claude-haiku-4-5-20251001" },
  { id: "fact-01-b", taskId: "fact-01", text: "2001.", model: "claude-haiku-4-5-20251001" },
];
const output = {
  candidate_a: { correctness: 2, relevance: 2, completeness: 2, unsupported_claims: false },
  candidate_b: { correctness: 0, relevance: 2, completeness: 2, unsupported_claims: true },
  declared_preference: "a",
  explanation: "A matches the passage.",
};

async function* resultStream(results) {
  yield* results;
}

describe("batch result reader", () => {
  it("matches results by custom ID even when the service changes order", async () => {
    const client = {
      messages: {
        batches: {
          results: async () => resultStream([
            {
              custom_id: "trial-000001",
              result: {
                type: "succeeded",
                message: {
                  content: [{ type: "text", text: JSON.stringify(output) }],
                  stop_reason: "end_turn",
                  usage: { input_tokens: 100, output_tokens: 20 },
                },
              },
            },
          ]),
        },
      },
    };

    const records = await readJudgeBatchResults({
      client,
      batchId: "msgbatch_123",
      trials: [trial],
      tasks: [task],
      candidates,
      modelKey: "sonnet",
    });

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      trialId: "trial-000001",
      judgeModelKey: "sonnet",
      judgeModel: "claude-sonnet-4-6",
      status: "completed",
      declaredPreference: "a",
    });
  });

  it("records service failures without retrying or hiding them", async () => {
    const client = {
      messages: {
        batches: {
          results: async () => resultStream([{
            custom_id: "trial-000001",
            result: { type: "errored", error: { type: "invalid_request_error", message: "bad request" } },
          }]),
        },
      },
    };

    const records = await readJudgeBatchResults({
      client,
      batchId: "msgbatch_123",
      trials: [trial],
      tasks: [task],
      candidates,
    });

    expect(records).toEqual([{
      trialId: "trial-000001",
      judgeModelKey: "haiku",
      status: "failed",
      errorType: "invalid_request_error",
      errorMessage: "bad request",
    }]);
  });
});
