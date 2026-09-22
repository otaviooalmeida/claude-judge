import {
  cohenKappa,
  confusionMatrix,
  meanAbsoluteError,
  positionChangeRate,
  repeatabilityRate,
  verbosityOutcomes,
  wilsonInterval,
} from "../domain/metrics.js";
import { getJudgeModel } from "../config/models.js";

function invertPreference(preference) {
  if (preference === "a") return "b";
  if (preference === "b") return "a";
  return preference;
}

function alignHumanEvaluation(human, judgment) {
  if (judgment.candidateAId === human.candidateAId && judgment.candidateBId === human.candidateBId) {
    return { preference: human.preference, candidateA: human.candidateA, candidateB: human.candidateB };
  }
  if (judgment.candidateAId === human.candidateBId && judgment.candidateBId === human.candidateAId) {
    return { preference: invertPreference(human.preference), candidateA: human.candidateB, candidateB: human.candidateA };
  }
  return null;
}

function agreementRate(left, right) {
  if (left.length === 0) return null;
  return left.filter((value, index) => value === right[index]).length / left.length;
}

function costForUsage(usage, modelKey) {
  const pricing = getJudgeModel(modelKey).batchPricing;
  return ((usage.inputTokens * pricing.inputUsdPerMillion) + (usage.outputTokens * pricing.outputUsdPerMillion)) / 1_000_000;
}

function firstNaturalTrials(judgments) {
  const grouped = new Map();
  for (const judgment of judgments) {
    if (judgment.kind !== "repeatability" || judgment.presentationOrder !== "canonical") continue;
    const key = `${judgment.taskId}:${judgment.promptVersion}`;
    const current = grouped.get(key);
    if (!current || judgment.trialId < current.trialId) grouped.set(key, judgment);
  }
  return [...grouped.values()];
}

function biasSummary(judgments, promptVersion) {
  const promptJudgments = judgments.filter((judgment) => judgment.promptVersion === promptVersion);
  const repeats = new Map();
  for (const judgment of promptJudgments) {
    if (judgment.kind !== "repeatability" || judgment.presentationOrder !== "canonical") continue;
    const trials = repeats.get(judgment.taskId) ?? [];
    trials.push(judgment.declaredPreference);
    repeats.set(judgment.taskId, trials);
  }

  const canonical = new Map();
  for (const judgment of promptJudgments) {
    if (judgment.kind === "repeatability" && judgment.presentationOrder === "canonical") {
      const current = canonical.get(judgment.taskId);
      if (!current || judgment.trialId < current.trialId) canonical.set(judgment.taskId, judgment);
    }
  }
  const positionBaseline = [];
  const positionReversed = [];
  for (const judgment of promptJudgments.filter((item) => item.kind === "position")) {
    const baseline = canonical.get(judgment.taskId);
    if (!baseline) continue;
    positionBaseline.push(baseline.declaredPreference);
    positionReversed.push(
      judgment.candidateAId === baseline.candidateAId
        ? judgment.declaredPreference
        : invertPreference(judgment.declaredPreference),
    );
  }

  const verbosityPreferences = promptJudgments
    .filter((judgment) => judgment.kind === "verbosity")
    .map((judgment) => {
      if (judgment.declaredPreference === "tie") return "tie";
      const longIsA = judgment.presentationOrder === "long-short";
      const longWon = longIsA ? judgment.declaredPreference === "a" : judgment.declaredPreference === "b";
      return longWon ? "b" : "a";
    });

  return {
    repeatability: repeatabilityRate([...repeats.values()]),
    positionChangeRate: positionChangeRate(positionBaseline, positionReversed),
    verbosity: verbosityOutcomes(verbosityPreferences),
  };
}

function summarizeComparisons(comparisons, modelKey) {
  if (comparisons.length === 0) {
    return {
      denominator: 0,
      preferenceAgreement: null,
      preferenceAgreementInterval: null,
      cohenKappa: null,
      meanAbsoluteError: null,
      unsupportedClaims: null,
      declaredRuleDisagreements: 0,
      actualBatchCostUsd: 0,
    };
  }

  const humanPreferences = comparisons.map((comparison) => comparison.human.preference);
  const judgePreferences = comparisons.map((comparison) => comparison.judgment.declaredPreference);
  const humanScores = comparisons.flatMap((comparison) => [comparison.human.candidateA, comparison.human.candidateB]);
  const judgeScores = comparisons.flatMap((comparison) => [comparison.judgment.candidateA, comparison.judgment.candidateB]);
  const humanUnsupported = humanScores.map((scorecard) => scorecard.unsupportedClaims);
  const judgeUnsupported = judgeScores.map((scorecard) => scorecard.unsupportedClaims);
  const agreementCount = humanPreferences.filter((value, index) => value === judgePreferences[index]).length;

  return {
    denominator: comparisons.length,
    preferenceAgreement: agreementRate(humanPreferences, judgePreferences),
    preferenceAgreementInterval: wilsonInterval(agreementCount, comparisons.length),
    cohenKappa: cohenKappa(humanPreferences, judgePreferences),
    meanAbsoluteError: meanAbsoluteError(humanScores, judgeScores),
    unsupportedClaims: confusionMatrix(humanUnsupported, judgeUnsupported),
    declaredRuleDisagreements: comparisons.filter(
      (comparison) => comparison.judgment.declaredPreference !== comparison.judgment.ruleDerivedPreference,
    ).length,
    actualBatchCostUsd: comparisons.reduce(
      (sum, comparison) => sum + costForUsage(comparison.judgment.usage, modelKey),
      0,
    ),
  };
}

function analyzeOneModel({ humanEvaluations, judgments, modelKey }) {
  const humanByTask = new Map(humanEvaluations.map((evaluation) => [evaluation.taskId, evaluation]));
  const completed = judgments.filter((judgment) => judgment.status === "completed");
  const headlineTrials = firstNaturalTrials(completed);
  const comparisons = headlineTrials.flatMap((judgment) => {
    const human = humanByTask.get(judgment.taskId);
    const aligned = human && alignHumanEvaluation(human, judgment);
    return aligned ? [{ human: aligned, judgment }] : [];
  });

  const byPrompt = {};
  const biasByPrompt = {};
  for (const promptVersion of ["baseline", "anchored"]) {
    byPrompt[promptVersion] = summarizeComparisons(
      comparisons.filter(({ judgment }) => judgment.promptVersion === promptVersion),
      modelKey,
    );
    byPrompt[promptVersion].actualBatchCostUsd = completed
      .filter((judgment) => judgment.promptVersion === promptVersion)
      .reduce((sum, judgment) => sum + costForUsage(judgment.usage, modelKey), 0);
    biasByPrompt[promptVersion] = biasSummary(completed, promptVersion);
  }

  return {
    modelKey,
    model: getJudgeModel(modelKey).model,
    totalJudgments: judgments.length,
    completedJudgments: completed.length,
    failedJudgments: judgments.length - completed.length,
    unalignedJudgments: headlineTrials.length - comparisons.length,
    byPrompt,
    biasByPrompt,
  };
}

export function analyzeJudgments({ humanEvaluations, judgments }) {
  const modelKeys = ["haiku", "sonnet", ...judgments.map((judgment) => judgment.judgeModelKey).filter(Boolean)]
    .filter((key, index, all) => all.indexOf(key) === index);
  const byModel = Object.fromEntries(modelKeys.map((modelKey) => [
    modelKey,
    analyzeOneModel({
      humanEvaluations,
      judgments: judgments.filter((judgment) => (judgment.judgeModelKey ?? "haiku") === modelKey),
      modelKey,
    }),
  ]));
  const defaultSummary = byModel.haiku;

  return {
    totalJudgments: judgments.length,
    completedJudgments: judgments.filter((judgment) => judgment.status === "completed").length,
    failedJudgments: judgments.filter((judgment) => judgment.status !== "completed").length,
    byModel,
    // Kept as aliases for existing consumers and fixtures.
    byPrompt: defaultSummary.byPrompt,
    biasByPrompt: defaultSummary.biasByPrompt,
  };
}
