export function buildHumanEvaluationTemplate({ tasks, candidates }) {
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  return tasks
    .filter((task) => task.split === "evaluation")
    .map((task) => {
      const candidateA = candidateById.get(`${task.id}-a`);
      const candidateB = candidateById.get(`${task.id}-b`);
      if (!candidateA || !candidateB) {
        throw new Error(`Cannot create human label template: missing candidate pair for ${task.id}`);
      }

      return {
        taskId: task.id,
        candidateAId: candidateA.id,
        candidateBId: candidateB.id,
        candidateA: { correctness: null, relevance: null, completeness: null, unsupportedClaims: null },
        candidateB: { correctness: null, relevance: null, completeness: null, unsupportedClaims: null },
        preference: null,
      };
    });
}
