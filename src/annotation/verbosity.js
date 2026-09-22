import { CandidateSchema } from "../schemas/domain.js";
import { selectVerbosityTasks } from "../planning/study.js";

export function buildVerbosityTemplate({ tasks, candidates }) {
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  return selectVerbosityTasks(tasks).map((task) => {
    const sourceCandidate = candidateById.get(`${task.id}-a`);
    if (!sourceCandidate) throw new Error(`Missing source candidate for verbosity control ${task.id}`);

    return {
      taskId: task.id,
      sourceCandidateId: sourceCandidate.id,
      shortCandidate: {
        id: `${task.id}-short`,
        taskId: task.id,
        text: sourceCandidate.text,
        model: sourceCandidate.model,
      },
      longCandidate: {
        id: `${task.id}-long`,
        taskId: task.id,
        text: null,
        model: sourceCandidate.model,
      },
    };
  });
}

export function finalizeVerbosityTemplate(template) {
  return template.flatMap((item) => {
    if (!item.longCandidate?.text?.trim()) {
      throw new Error(`Verbosity control ${item.taskId} needs a human-reviewed expanded response`);
    }
    return [
      CandidateSchema.parse(item.shortCandidate),
      CandidateSchema.parse(item.longCandidate),
    ];
  });
}
