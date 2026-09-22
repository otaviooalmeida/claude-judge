const PREFERENCES = ["a", "b", "tie"];
const SCORE_FIELDS = ["correctness", "relevance", "completeness"];

function assertSameLength(left, right) {
  if (left.length !== right.length) {
    throw new Error(`Expected arrays of equal length, got ${left.length} and ${right.length}`);
  }
}

function countByCategory(values) {
  return Object.fromEntries(PREFERENCES.map((category) => [category, values.filter((value) => value === category).length]));
}

/** @returns {number | null} */
export function cohenKappa(human, judge) {
  assertSameLength(human, judge);
  if (human.length === 0) return null;

  const observedAgreement = human.filter((value, index) => value === judge[index]).length / human.length;
  const humanCounts = countByCategory(human);
  const judgeCounts = countByCategory(judge);
  const expectedAgreement = PREFERENCES.reduce(
    (sum, category) => sum + (humanCounts[category] / human.length) * (judgeCounts[category] / judge.length),
    0,
  );

  if (expectedAgreement === 1) return null;
  return (observedAgreement - expectedAgreement) / (1 - expectedAgreement);
}

export function wilsonInterval(successes, total, z = 1.96) {
  if (total === 0) return null;
  if (!Number.isFinite(successes) || !Number.isFinite(total) || successes < 0 || total < 0 || successes > total) {
    throw new RangeError("Wilson interval requires 0 <= successes <= total");
  }

  const proportion = successes / total;
  const denominator = 1 + (z ** 2) / total;
  const center = (proportion + (z ** 2) / (2 * total)) / denominator;
  const margin = (z * Math.sqrt(
    (proportion * (1 - proportion)) / total + (z ** 2) / (4 * total ** 2),
  )) / denominator;
  return [center - margin, center + margin];
}

export function meanAbsoluteError(human, judge) {
  assertSameLength(human, judge);
  if (human.length === 0) return null;

  return Object.fromEntries(
    SCORE_FIELDS.map((field) => [
      field,
      human.reduce((sum, scorecard, index) => sum + Math.abs(scorecard[field] - judge[index][field]), 0) / human.length,
    ]),
  );
}

export function confusionMatrix(human, judge) {
  assertSameLength(human, judge);
  return human.reduce(
    (matrix, value, index) => {
      const predicted = judge[index];
      if (value && predicted) matrix.truePositive += 1;
      else if (!value && !predicted) matrix.trueNegative += 1;
      else if (!value && predicted) matrix.falsePositive += 1;
      else matrix.falseNegative += 1;
      return matrix;
    },
    { truePositive: 0, trueNegative: 0, falsePositive: 0, falseNegative: 0 },
  );
}

/** @returns {number | null} */
export function repeatabilityRate(preferenceTrials) {
  if (preferenceTrials.length === 0) return null;
  const repeatableTasks = preferenceTrials.filter(
    (trials) => trials.length > 0 && trials.every((preference) => preference === trials[0]),
  ).length;
  return repeatableTasks / preferenceTrials.length;
}

/** @returns {number | null} */
export function positionChangeRate(baseline, reversed) {
  assertSameLength(baseline, reversed);
  if (baseline.length === 0) return null;
  return baseline.filter((preference, index) => preference !== reversed[index]).length / baseline.length;
}

export function verbosityOutcomes(preferences) {
  return preferences.reduce(
    (summary, preference) => {
      if (preference === "b") summary.longerWins += 1;
      else if (preference === "a") summary.shorterWins += 1;
      else summary.ties += 1;
      summary.total += 1;
      return summary;
    },
    { longerWins: 0, shorterWins: 0, ties: 0, total: 0 },
  );
}
