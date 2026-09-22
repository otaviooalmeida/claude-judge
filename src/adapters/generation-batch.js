import { CandidateSchema } from "../schemas/domain.js";
import { CANDIDATE_GENERATOR_MODELS, getJudgeModel } from "../config/models.js";
import {
  buildCandidateGenerationParams,
  CANDIDATE_TEMPERATURES,
} from "./anthropic-params.js";
import { normalizeUsage } from "./anthropic-client.js";
import { waitForBatchCompletion } from "./batch-lifecycle.js";

export function buildCandidateBatchRequests({ tasks }) {
  return tasks.flatMap((task) => ["a", "b"].map((suffix) => ({
    custom_id: `${task.id}-${suffix}`,
    params: buildCandidateGenerationParams({
      task,
      modelKey: CANDIDATE_GENERATOR_MODELS[suffix],
      temperature: CANDIDATE_TEMPERATURES[suffix],
    }),
  })));
}

export async function submitCandidateBatch({ client, requests }) {
  if (!Array.isArray(requests) || requests.length === 0) {
    throw new Error("Cannot submit an empty candidate batch");
  }
  return client.messages.batches.create({ requests });
}

export async function readCandidateBatchResults({
  client,
  batchId,
  tasks,
  pollIntervalMs,
  maxWaitMs,
  sleep,
  onStatus,
}) {
  const taskByCandidateId = new Map(
    tasks.flatMap((task) => [
      [`${task.id}-a`, task],
      [`${task.id}-b`, task],
    ]),
  );
  const results = [];
  await waitForBatchCompletion({ client, batchId, pollIntervalMs, maxWaitMs, sleep, onStatus });
  const stream = await client.messages.batches.results(batchId);

  for await (const item of stream) {
    const task = taskByCandidateId.get(item.custom_id);
    if (item.result?.type !== "succeeded") {
      const error = item.result?.error;
      results.push({
        candidateId: item.custom_id,
        status: "failed",
        errorType: error?.type ?? item.result?.type ?? "batch_failure",
        errorMessage: error?.message ?? JSON.stringify(error ?? "Unknown batch failure"),
      });
      continue;
    }

    const text = item.result.message?.content?.find((block) => block.type === "text")?.text?.trim();
    if (!task || !text) {
      results.push({
        candidateId: item.custom_id,
        status: "failed",
        errorType: "invalid_success_result",
        errorMessage: "Successful result was missing task metadata or text",
      });
      continue;
    }

    const suffix = item.custom_id.endsWith("-b") ? "b" : "a";
    const modelKey = CANDIDATE_GENERATOR_MODELS[suffix];
    results.push({
      candidate: CandidateSchema.parse({
        id: item.custom_id,
        taskId: task.id,
        text,
        model: getJudgeModel(modelKey).model,
        generationTemperature: CANDIDATE_TEMPERATURES[suffix],
      }),
      status: item.result.message.stop_reason === "max_tokens" ? "truncated" : "completed",
      stopReason: item.result.message.stop_reason ?? null,
      usage: normalizeUsage(item.result.message.usage),
    });
  }

  return results;
}
