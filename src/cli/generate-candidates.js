import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createAnthropicClient } from "../adapters/anthropic.js";
import {
  buildCandidateBatchRequests,
  readCandidateBatchResults,
  submitCandidateBatch,
} from "../adapters/generation-batch.js";
import { readJsonLines, writeJsonLines } from "../io/jsonl.js";
import { CandidateSchema, TaskSchema } from "../schemas/domain.js";
import { CANDIDATE_GENERATOR_MODELS } from "../config/models.js";
import { CANDIDATE_TEMPERATURES } from "../adapters/anthropic-params.js";

const TASK_PATH = "data/tasks/tasks.jsonl";
const CANDIDATE_PATH = "data/candidates/candidates.jsonl";
const BATCH_META_PATH = "data/results/candidate-batch.json";

function options(argv) {
  return {
    execute: argv.includes("--execute"),
    retrieve: argv.includes("--retrieve"),
    batchId: argv.find((value) => value.startsWith("--batch-id="))?.split("=")[1],
  };
}

async function main(argv = process.argv.slice(2)) {
  const flags = options(argv);
  if (!flags.execute) {
    console.log("Paid execution is disabled. Review data/tasks/tasks.jsonl, then rerun with --execute explicitly.");
    return;
  }

  const client = createAnthropicClient();
  const tasks = await readJsonLines(TASK_PATH, TaskSchema);

  if (!flags.retrieve) {
    const requests = buildCandidateBatchRequests({ tasks });
    const batch = await submitCandidateBatch({ client, requests });
    await writeFile(BATCH_META_PATH, `${JSON.stringify({
      batchId: batch.id,
      requestCount: requests.length,
      candidateGeneratorModels: CANDIDATE_GENERATOR_MODELS,
      candidateTemperatures: CANDIDATE_TEMPERATURES,
      processingStatus: batch.processing_status,
      submittedAt: new Date().toISOString(),
    }, null, 2)}\n`, "utf8");
    console.log(`Submitted candidate batch ${batch.id}. Metadata saved to ${BATCH_META_PATH}.`);
    return;
  }

  let batchId = flags.batchId;
  if (!batchId) {
    const metadata = JSON.parse(await readFile(BATCH_META_PATH, "utf8"));
    batchId = metadata.batchId;
  }
  const results = await readCandidateBatchResults({
    client,
    batchId,
    tasks,
    onStatus: (status) => console.log(`Candidate batch ${batchId}: ${status}`),
  });
  const candidates = results.filter((result) => result.candidate).map((result) => result.candidate);
  const failures = results.filter((result) => result.status !== "completed");
  await writeJsonLines(CANDIDATE_PATH, candidates);
  await writeJsonLines("data/results/candidate-errors.jsonl", failures);
  console.log(JSON.stringify({ batchId, candidates: candidates.length, failures: failures.length, candidatePath: CANDIDATE_PATH }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack ?? error.message);
    process.exitCode = 1;
  });
}

export { main };
