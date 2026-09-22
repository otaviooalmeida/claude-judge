import { DEFAULT_JUDGE_MODEL_KEY } from "../config/models.js";
import { judgmentRecordFromStructuredResponse } from "./anthropic-client.js";
import { waitForBatchCompletion } from "./batch-lifecycle.js";

function failureRecord(customId, errorType, errorMessage, modelKey) {
  return { trialId: customId, judgeModelKey: modelKey, status: "failed", errorType, errorMessage };
}

function errorDetails(error, fallbackType) {
  if (typeof error === "string") return { errorType: fallbackType, errorMessage: error };
  return {
    errorType: error?.type ?? fallbackType,
    errorMessage: error?.message ?? JSON.stringify(error ?? "Unknown batch failure"),
  };
}

export async function readJudgeBatchResults({
  client,
  batchId,
  trials,
  tasks,
  candidates,
  modelKey = DEFAULT_JUDGE_MODEL_KEY,
  pollIntervalMs,
  maxWaitMs,
  sleep,
  onStatus,
}) {
  const trialById = new Map(trials.map((trial) => [trial.customId, trial]));
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const results = [];
  await waitForBatchCompletion({ client, batchId, pollIntervalMs, maxWaitMs, sleep, onStatus });
  const stream = await client.messages.batches.results(batchId);

  for await (const item of stream) {
    const trial = trialById.get(item.custom_id);
    if (!trial) {
      results.push(failureRecord(item.custom_id, "unknown_custom_id", "No trial metadata was found", modelKey));
      continue;
    }

    if (item.result?.type !== "succeeded") {
      const details = errorDetails(item.result?.error, item.result?.type ?? "batch_failure");
      results.push(failureRecord(item.custom_id, details.errorType, details.errorMessage, modelKey));
      continue;
    }

    const task = taskById.get(trial.taskId);
    const [candidateAId, candidateBId] = trial.orderedCandidateIds ?? [];
    const candidateA = candidateById.get(candidateAId);
    const candidateB = candidateById.get(candidateBId);
    const text = item.result.message?.content?.find((block) => block.type === "text")?.text;

    if (!task || !candidateA || !candidateB || !text) {
      results.push(failureRecord(item.custom_id, "invalid_success_result", "Successful result was missing trial data or text", modelKey));
      continue;
    }

    try {
      const output = JSON.parse(text);
      results.push(judgmentRecordFromStructuredResponse({
        trial,
        candidateA,
        candidateB,
        output,
        response: item.result.message,
        modelKey,
      }));
    } catch (error) {
      results.push(failureRecord(
        item.custom_id,
        "structured_output_parse_error",
        error instanceof Error ? error.message : String(error),
        modelKey,
      ));
    }
  }

  return results;
}
