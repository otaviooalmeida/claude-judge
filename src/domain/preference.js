const priority = ["correctness", "unsupportedClaims", "completeness", "relevance"];

/**
 * Compares two candidate scorecards using the benchmark's published priority.
 * @param {{ correctness: number, relevance: number, completeness: number, unsupportedClaims: boolean }} candidateA
 * @param {{ correctness: number, relevance: number, completeness: number, unsupportedClaims: boolean }} candidateB
 * @returns {"a" | "b" | "tie"}
 */
export function derivePreference(candidateA, candidateB) {
  for (const criterion of priority) {
    const valueA = criterion === "unsupportedClaims"
      ? Number(!candidateA[criterion])
      : candidateA[criterion];
    const valueB = criterion === "unsupportedClaims"
      ? Number(!candidateB[criterion])
      : candidateB[criterion];

    if (valueA > valueB) return "a";
    if (valueB > valueA) return "b";
  }

  return "tie";
}
