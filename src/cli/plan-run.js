import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { readJsonLines } from "../io/jsonl.js";
import { TaskSchema } from "../schemas/domain.js";
import {
  assertWithinBudget,
  buildCalibrationTrialPlan,
  buildJudgeTrialPlan,
  BATCH_PRICING_BY_MODEL,
  estimateBatchCost,
} from "../planning/trials.js";
import { CANDIDATE_GENERATOR_MODELS, JUDGE_MODELS } from "../config/models.js";
import { selectVerbosityTasks } from "../planning/study.js";

const DEFAULT_TASK_PATH = "data/tasks/tasks.jsonl";
const DEFAULT_PLAN_PATH = "data/results/plan.json";
const TOTAL_CASH_CEILING_USD = 5;

export function createOfflinePlan(tasks) {
  const calibrationTasks = tasks.filter((task) => task.split === "calibration");
  const evaluationTasks = tasks.filter((task) => task.split === "evaluation");
  if (calibrationTasks.length !== 8 || evaluationTasks.length !== 40) {
    throw new Error(`Expected 8 calibration and 40 evaluation tasks; got ${calibrationTasks.length} and ${evaluationTasks.length}`);
  }

  const calibrationPairs = calibrationTasks.map((task) => ({
    pairId: task.id,
    taskId: task.id,
    candidateAId: `${task.id}-a`,
    candidateBId: `${task.id}-b`,
  }));
  const calibrationTrials = buildCalibrationTrialPlan({
    calibrationPairs,
    prompts: ["baseline", "anchored"],
  });

  const naturalPairs = evaluationTasks.map((task) => ({
    pairId: task.id,
    taskId: task.id,
    candidateAId: `${task.id}-a`,
    candidateBId: `${task.id}-b`,
  }));
  const verbosityTasks = selectVerbosityTasks(tasks);
  const verbosityPairs = verbosityTasks.map((task) => ({
    pairId: `${task.id}-verbosity`,
    taskId: task.id,
    shortCandidateId: `${task.id}-short`,
    longCandidateId: `${task.id}-long`,
  }));
  const trials = buildJudgeTrialPlan({
    naturalPairs,
    verbosityPairs,
    prompts: ["baseline", "anchored"],
  });

  const generationRequests = tasks.length * 2;
  const mainAndCalibrationJudgeRequests = trials.length + calibrationTasks.length * 2;
  const generationRequestsByModel = Object.fromEntries(
    [...new Set(Object.values(CANDIDATE_GENERATOR_MODELS))].map((modelKey) => [
      modelKey,
      Object.values(CANDIDATE_GENERATOR_MODELS).filter((candidateModelKey) => candidateModelKey === modelKey).length * tasks.length,
    ]),
  );
  const generationCostsByModel = Object.fromEntries(Object.entries(generationRequestsByModel).map(([modelKey, requestCount]) => [
    modelKey,
    estimateBatchCost({
      requestCount,
      inputTokensPerRequest: 250,
      maxOutputTokensPerRequest: 300,
      pricing: BATCH_PRICING_BY_MODEL[modelKey],
    }),
  ]));
  const generationCost = Object.values(generationCostsByModel).reduce((sum, cost) => sum + cost, 0);
  const judgeCosts = Object.fromEntries(Object.keys(JUDGE_MODELS).map((modelKey) => [
    modelKey,
    estimateBatchCost({
      requestCount: mainAndCalibrationJudgeRequests,
      inputTokensPerRequest: 1200,
      maxOutputTokensPerRequest: 400,
      pricing: BATCH_PRICING_BY_MODEL[modelKey],
    }),
  ]));
  const haikuOnlyCost = Number((generationCost + judgeCosts.haiku).toFixed(4));
  const comparisonCost = Number((generationCost + Object.values(judgeCosts).reduce((sum, cost) => sum + cost, 0)).toFixed(4));
  assertWithinBudget(comparisonCost, TOTAL_CASH_CEILING_USD);

  return {
    generatedAt: new Date().toISOString(),
    candidateGeneratorModels: CANDIDATE_GENERATOR_MODELS,
    judgeModels: Object.fromEntries(Object.entries(JUDGE_MODELS).map(([key, model]) => [key, {
      label: model.label,
      model: model.model,
      batchPricing: model.batchPricing,
    }])),
    prompts: ["baseline", "anchored"],
    taskCounts: { total: tasks.length, calibration: calibrationTasks.length, evaluation: evaluationTasks.length, verbosityControls: verbosityTasks.length },
    verbosityTaskIds: verbosityTasks.map((task) => task.id),
    requestCounts: {
      candidateGeneration: generationRequests,
      candidateGenerationByModel: generationRequestsByModel,
      mainJudgments: trials.length,
      calibrationJudgments: calibrationTasks.length * 2,
      judgmentsPerModel: mainAndCalibrationJudgeRequests,
      totalJudgmentsAcrossModels: mainAndCalibrationJudgeRequests * Object.keys(JUDGE_MODELS).length,
      totalRequests: generationRequests + (mainAndCalibrationJudgeRequests * Object.keys(JUDGE_MODELS).length),
    },
    calibrationTrials,
    tokenAssumptions: {
      generationInputPerRequest: 250,
      generationMaxOutputPerRequest: 300,
      judgeInputPerRequest: 1200,
      judgeMaxOutputPerRequest: 400,
    },
    costEstimateUsd: {
      candidateGeneration: generationCost,
      candidateGenerationByModel: generationCostsByModel,
      judgingByModel: judgeCosts,
      haikuOnly: haikuOnlyCost,
      comparison: comparisonCost,
      total: comparisonCost,
      cashCeiling: TOTAL_CASH_CEILING_USD,
    },
    paidExecution: "disabled",
    trials,
  };
}

async function main() {
  const tasks = await readJsonLines(DEFAULT_TASK_PATH, TaskSchema);
  const plan = createOfflinePlan(tasks);
  await writeFile(DEFAULT_PLAN_PATH, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    planPath: DEFAULT_PLAN_PATH,
    requests: plan.requestCounts,
    estimatedComparisonCostUsd: plan.costEstimateUsd.comparison,
    estimatedHaikuOnlyCostUsd: plan.costEstimateUsd.haikuOnly,
    paidExecution: plan.paidExecution,
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
