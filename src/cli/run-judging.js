import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createAnthropicClient } from "../adapters/anthropic.js";
import { buildJudgeBatchRequests, submitJudgeBatch } from "../adapters/anthropic-batches.js";
import { readJudgeBatchResults } from "../adapters/batch-results.js";
import { DEFAULT_JUDGE_MODEL_KEY, getJudgeModel, JUDGE_MODELS } from "../config/models.js";
import { readJsonLines, writeJsonLines } from "../io/jsonl.js";
import { CandidateSchema, TaskSchema } from "../schemas/domain.js";

const TASK_PATH = "data/tasks/tasks.jsonl";
const CANDIDATE_PATH = "data/candidates/candidates.jsonl";
const PLAN_PATH = "data/results/plan.json";

function readOption(argv, name, fallback) {
  const inline = argv.find((value) => value.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = argv.indexOf(`--${name}`);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

function options(argv) {
  const requestedModel = readOption(argv, "model", "all");
  const modelKeys = requestedModel === "all"
    ? Object.keys(JUDGE_MODELS)
    : [requestedModel];
  modelKeys.forEach((modelKey) => getJudgeModel(modelKey));
  return {
    execute: argv.includes("--execute"),
    retrieve: argv.includes("--retrieve"),
    calibration: argv.includes("--calibration"),
    modelKeys,
  };
}

function batchMetadataPath(modelKey, kind) {
  return `data/results/judge-batch-${modelKey}-${kind}.json`;
}

function judgmentPath(modelKey, kind) {
  return kind === "main"
    ? `data/results/judgments-${modelKey}.jsonl`
    : `data/results/judgments-${modelKey}-calibration.jsonl`;
}

async function loadCandidates() {
  const candidates = await readJsonLines(CANDIDATE_PATH, CandidateSchema);
  let verbosityCandidates = [];
  try {
    verbosityCandidates = await readJsonLines("data/candidates/verbosity.jsonl", CandidateSchema);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return [...candidates, ...verbosityCandidates];
}

async function loadPlan() {
  return JSON.parse(await readFile(PLAN_PATH, "utf8"));
}

async function submitForModel({ client, modelKey, kind, trials, tasks, candidates }) {
  const requests = buildJudgeBatchRequests({ trials, tasks, candidates, modelKey });
  const batch = await submitJudgeBatch({ client, requests });
  await writeFile(batchMetadataPath(modelKey, kind), `${JSON.stringify({
    batchId: batch.id,
    modelKey,
    model: getJudgeModel(modelKey).model,
    kind,
    trialCount: trials.length,
    processingStatus: batch.processing_status,
    submittedAt: new Date().toISOString(),
  }, null, 2)}\n`, "utf8");
  return { modelKey, batchId: batch.id, trialCount: trials.length };
}

async function retrieveForModel({ client, modelKey, kind, trials, tasks, candidates, explicitBatchId }) {
  let batchId = explicitBatchId;
  if (!batchId) {
    const metadata = JSON.parse(await readFile(batchMetadataPath(modelKey, kind), "utf8"));
    batchId = metadata.batchId;
  }
  const records = await readJudgeBatchResults({
    client,
    batchId,
    trials,
    tasks,
    candidates,
    modelKey,
    onStatus: (status) => console.log(`${modelKey} batch ${batchId}: ${status}`),
  });
  const outputPath = judgmentPath(modelKey, kind);
  await writeJsonLines(outputPath, records);
  return {
    modelKey,
    batchId,
    records: records.length,
    failed: records.filter((record) => record.status === "failed").length,
    judgmentPath: outputPath,
  };
}

async function main(argv = process.argv.slice(2)) {
  const flags = options(argv);
  if (!flags.execute) {
    console.log(`Paid execution is disabled. Planned judge models: ${flags.modelKeys.join(", ")}. Rerun with --execute explicitly.`);
    return;
  }

  const plan = await loadPlan();
  if (plan.costEstimateUsd.comparison > plan.costEstimateUsd.cashCeiling) {
    throw new Error("The planned Haiku + Sonnet comparison exceeds the configured cash ceiling");
  }
  const client = createAnthropicClient();
  const tasks = await readJsonLines(TASK_PATH, TaskSchema);
  const candidates = await loadCandidates();
  const kind = flags.calibration ? "calibration" : "main";
  const trials = flags.calibration ? plan.calibrationTrials : plan.trials;
  if (!trials?.length) throw new Error("The selected judging plan is empty");

  if (!flags.retrieve) {
    const submissions = [];
    for (const modelKey of flags.modelKeys) {
      submissions.push(await submitForModel({ client, modelKey, kind, trials, tasks, candidates }));
    }
    console.log(JSON.stringify({ kind, submissions }, null, 2));
    return;
  }

  const explicitBatchId = readOption(argv, "batch-id", null);
  const retrieved = [];
  for (const modelKey of flags.modelKeys) {
    retrieved.push(await retrieveForModel({
      client,
      modelKey,
      kind,
      trials,
      tasks,
      candidates,
      explicitBatchId: flags.modelKeys.length === 1 ? explicitBatchId : null,
    }));
  }
  console.log(JSON.stringify({ kind, retrieved }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack ?? error.message);
    process.exitCode = 1;
  });
}

export { main, options };
