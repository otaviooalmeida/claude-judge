import { describe, expect, it } from "vitest";
import {
  buildCandidateBatchRequests,
  readCandidateBatchResults,
  submitCandidateBatch,
} from "../../src/adapters/generation-batch.js";

const task = {
  id: "fact-01",
  split: "evaluation",
  category: "factual_qa",
  passage: "Aster was founded in 1998.",
  instruction: "When was Aster founded?",
  referenceChecklist: ["States 1998."],
};

describe("candidate generation batch adapter", () => {
  it("creates two independent generation requests per task", () => {
    const requests = buildCandidateBatchRequests({ tasks: [task] });

    expect(requests).toHaveLength(2);
    expect(requests.map((request) => request.custom_id)).toEqual([
      "fact-01-a",
      "fact-01-b",
    ]);
    expect(requests[0].params.temperature).toBe(0.7);
  });

  it("submits a candidate batch through the official batch boundary", async () => {
    const calls = [];
    const client = {
      messages: {
        batches: {
          create: async (params) => {
            calls.push(params);
            return { id: "msgbatch_generation", processing_status: "in_progress" };
          },
        },
      },
    };
    const requests = [{ custom_id: "fact-01-a", params: {} }];

    await expect(submitCandidateBatch({ client, requests })).resolves.toMatchObject({
      id: "msgbatch_generation",
    });
    expect(calls).toEqual([{ requests }]);
  });

  it("normalizes successful text results and preserves generation failures", async () => {
    async function* stream() {
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
      yield {
        custom_id: "fact-01-b",
        result: { type: "expired", error: { type: "expired", message: "expired" } },
      };
    }
    const client = { messages: { batches: { results: async () => stream() } } };

    const results = await readCandidateBatchResults({ client, batchId: "msgbatch_generation", tasks: [task] });

    expect(results[0]).toMatchObject({ candidate: { id: "fact-01-a", text: "Aster was founded in 1998." } });
    expect(results[1]).toEqual({
      candidateId: "fact-01-b",
      status: "failed",
      errorType: "expired",
      errorMessage: "expired",
    });
  });
});
