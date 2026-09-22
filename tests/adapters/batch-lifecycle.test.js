import { describe, expect, it } from "vitest";
import { readCandidateBatchResults } from "../../src/adapters/generation-batch.js";

const task = {
  id: "fact-01",
  split: "evaluation",
  category: "factual_qa",
  passage: "Aster was founded in 1998.",
  instruction: "When was Aster founded?",
  referenceChecklist: ["States 1998."],
};

async function* resultStream() {
  yield {
    custom_id: "fact-01-a",
    result: {
      type: "succeeded",
      message: {
        content: [{ type: "text", text: "Aster was founded in 1998." }],
        stop_reason: "end_turn",
        usage: { input_tokens: 30, output_tokens: 10 },
      },
    },
  };
}

describe("batch lifecycle", () => {
  it("waits for an in-progress batch before requesting results", async () => {
    const statuses = ["in_progress", "ended"];
    const retrieveCalls = [];
    const client = {
      messages: {
        batches: {
          retrieve: async (batchId) => {
            retrieveCalls.push(batchId);
            return { processing_status: statuses.shift() };
          },
          results: async () => resultStream(),
        },
      },
    };

    const results = await readCandidateBatchResults({
      client,
      batchId: "msgbatch_123",
      tasks: [task],
      pollIntervalMs: 0,
      sleep: async () => {},
    });

    expect(retrieveCalls).toEqual(["msgbatch_123", "msgbatch_123"]);
    expect(results[0].candidate.text).toContain("1998");
  });
});
