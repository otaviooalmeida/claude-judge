import { describe, expect, it } from "vitest";
import {
  buildJudgeBatchRequests,
  submitJudgeBatch,
} from "../../src/adapters/anthropic-batches.js";

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
const trial = {
  customId: "trial-000001",
  kind: "repeatability",
  pairId: "fact-01",
  taskId: "fact-01",
  promptVersion: "baseline",
  presentationOrder: "canonical",
  orderedCandidateIds: ["fact-01-a", "fact-01-b"],
};

describe("Anthropic batch adapter", () => {
  it("builds independent batch requests with custom IDs", () => {
    const requests = buildJudgeBatchRequests({
      trials: [trial],
      tasks: [task],
      candidates,
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].custom_id).toBe("trial-000001");
    expect(requests[0].params.model).toBe("claude-haiku-4-5-20251001");
    expect(requests[0].params.messages[0].content).toContain("1998.");
  });

  it("fails before submission when a trial references missing data", () => {
    expect(() => buildJudgeBatchRequests({
      trials: [trial],
      tasks: [],
      candidates,
    })).toThrow(/task.*fact-01/i);
  });

  it("can build the same trial for Sonnet without changing candidate identity", () => {
    const requests = buildJudgeBatchRequests({
      trials: [trial],
      tasks: [task],
      candidates,
      modelKey: "sonnet",
    });

    expect(requests[0].params.model).toBe("claude-sonnet-4-6");
    expect(requests[0].custom_id).toBe("trial-000001");
  });

  it("submits exactly the prepared requests and returns the batch metadata", async () => {
    const calls = [];
    const client = {
      messages: {
        batches: {
          create: async (params) => {
            calls.push(params);
            return { id: "msgbatch_123", processing_status: "in_progress" };
          },
        },
      },
    };

    const result = await submitJudgeBatch({ client, requests: [{ custom_id: "trial-000001", params: {} }] });

    expect(calls).toEqual([{ requests: [{ custom_id: "trial-000001", params: {} }] }]);
    expect(result).toEqual({ id: "msgbatch_123", processing_status: "in_progress" });
  });
});
