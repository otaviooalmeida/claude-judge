import { DEFAULT_JUDGE_MODEL_KEY } from "../config/models.js";
import { buildJudgeParams } from "./anthropic-params.js";

export function buildJudgeBatchRequests({ trials, tasks, candidates, modelKey = DEFAULT_JUDGE_MODEL_KEY }) {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));

  return trials.map((trial) => {
    const task = taskById.get(trial.taskId);
    if (!task) throw new Error(`Trial ${trial.customId} references missing task ${trial.taskId}`);

    const [candidateAId, candidateBId] = trial.orderedCandidateIds;
    const candidateA = candidateById.get(candidateAId);
    const candidateB = candidateById.get(candidateBId);
    if (!candidateA || !candidateB) {
      throw new Error(`Trial ${trial.customId} references missing candidate for task ${trial.taskId}`);
    }

    return {
      custom_id: trial.customId,
      params: buildJudgeParams({
        task,
        candidateA,
        candidateB,
        promptVersion: trial.promptVersion,
        modelKey,
      }),
    };
  });
}

export async function submitJudgeBatch({ client, requests }) {
  if (!Array.isArray(requests) || requests.length === 0) {
    throw new Error("Cannot submit an empty judge batch");
  }
  return client.messages.batches.create({ requests });
}
