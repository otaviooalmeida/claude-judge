import { access } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { readJsonLines, writeJsonLines } from "../io/jsonl.js";
import { buildHumanEvaluationTemplate } from "../annotation/template.js";
import { CandidateSchema, TaskSchema } from "../schemas/domain.js";

const TASK_PATH = "data/tasks/tasks.jsonl";
const CANDIDATE_PATH = "data/candidates/candidates.jsonl";
const OUTPUT_PATH = "data/human/evaluations.template.jsonl";

async function main() {
  try {
    await access(OUTPUT_PATH);
    throw new Error(`${OUTPUT_PATH} already exists; move it aside before regenerating a template`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const tasks = await readJsonLines(TASK_PATH, TaskSchema);
  const candidates = await readJsonLines(CANDIDATE_PATH, CandidateSchema);
  const template = buildHumanEvaluationTemplate({ tasks, candidates });
  await writeJsonLines(OUTPUT_PATH, template);
  console.log(`Wrote ${template.length} blank evaluation labels to ${OUTPUT_PATH}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack ?? error.message);
    process.exitCode = 1;
  });
}

export { main };
