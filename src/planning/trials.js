import { JUDGE_MODELS } from "../config/models.js";

const BATCH_INPUT_USD_PER_MILLION = 0.5;
const BATCH_OUTPUT_USD_PER_MILLION = 2.5;

function requireNonEmpty(name, values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`${name} must contain at least one value`);
  }
}

/**
 * Builds an immutable description of every paid judge request in the main study.
 * The request body is added later by the Anthropic adapter.
 */
export function buildJudgeTrialPlan({ naturalPairs, verbosityPairs, prompts }) {
  requireNonEmpty("naturalPairs", naturalPairs);
  requireNonEmpty("verbosityPairs", verbosityPairs);
  requireNonEmpty("prompts", prompts);

  const plan = [];
  const add = (trial) => {
    plan.push({
      ...trial,
      customId: `trial-${String(plan.length + 1).padStart(6, "0")}`,
    });
  };

  for (const pair of naturalPairs) {
    for (const promptVersion of prompts) {
      for (let repeatIndex = 0; repeatIndex < 3; repeatIndex += 1) {
        add({
          kind: "repeatability",
          pairId: pair.pairId,
          taskId: pair.taskId,
          promptVersion,
          repeatIndex,
          presentationOrder: "canonical",
          orderedCandidateIds: [pair.candidateAId, pair.candidateBId],
        });
      }

      add({
        kind: "position",
        pairId: pair.pairId,
        taskId: pair.taskId,
        promptVersion,
        repeatIndex: null,
        presentationOrder: "reversed",
        orderedCandidateIds: [pair.candidateBId, pair.candidateAId],
      });
    }
  }

  for (const pair of verbosityPairs) {
    for (const promptVersion of prompts) {
      add({
        kind: "verbosity",
        pairId: pair.pairId,
        taskId: pair.taskId,
        promptVersion,
        repeatIndex: null,
        presentationOrder: "short-long",
        orderedCandidateIds: [pair.shortCandidateId, pair.longCandidateId],
      });
      add({
        kind: "verbosity",
        pairId: pair.pairId,
        taskId: pair.taskId,
        promptVersion,
        repeatIndex: null,
        presentationOrder: "long-short",
        orderedCandidateIds: [pair.longCandidateId, pair.shortCandidateId],
      });
    }
  }

  return plan;
}

export function buildCalibrationTrialPlan({ calibrationPairs, prompts }) {
  requireNonEmpty("calibrationPairs", calibrationPairs);
  requireNonEmpty("prompts", prompts);

  const plan = [];
  for (const pair of calibrationPairs) {
    for (const promptVersion of prompts) {
      plan.push({
        customId: `calibration-${String(plan.length + 1).padStart(4, "0")}`,
        kind: "calibration",
        pairId: pair.pairId,
        taskId: pair.taskId,
        promptVersion,
        repeatIndex: null,
        presentationOrder: "canonical",
        orderedCandidateIds: [pair.candidateAId, pair.candidateBId],
      });
    }
  }
  return plan;
}

export function estimateBatchCost({
  requestCount,
  inputTokensPerRequest,
  maxOutputTokensPerRequest,
  pricing = BATCH_PRICING,
}) {
  if (![requestCount, inputTokensPerRequest, maxOutputTokensPerRequest].every(Number.isFinite)) {
    throw new TypeError("Cost inputs must be finite numbers");
  }
  if ([requestCount, inputTokensPerRequest, maxOutputTokensPerRequest].some((value) => value < 0)) {
    throw new RangeError("Cost inputs cannot be negative");
  }

  const inputCost = (requestCount * inputTokensPerRequest * pricing.inputUsdPerMillion) / 1_000_000;
  const outputCost = (requestCount * maxOutputTokensPerRequest * pricing.outputUsdPerMillion) / 1_000_000;
  return inputCost + outputCost;
}

export function assertWithinBudget(estimatedCost, budget) {
  if (!Number.isFinite(estimatedCost) || !Number.isFinite(budget)) {
    throw new TypeError("Budget values must be finite numbers");
  }
  if (estimatedCost > budget) {
    throw new Error(`Conservative estimate of $${estimatedCost.toFixed(4)} exceeds budget of $${budget.toFixed(2)}`);
  }
}

export const BATCH_PRICING = Object.freeze({
  inputUsdPerMillion: BATCH_INPUT_USD_PER_MILLION,
  outputUsdPerMillion: BATCH_OUTPUT_USD_PER_MILLION,
});

export const BATCH_PRICING_BY_MODEL = Object.freeze(Object.fromEntries(
  Object.entries(JUDGE_MODELS).map(([key, model]) => [key, model.batchPricing]),
));
