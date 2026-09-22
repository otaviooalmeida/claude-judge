import { pathToFileURL } from "node:url";
import { buildVerbosityTemplate } from "../annotation/verbosity.js";
import { readJsonLines, writeJsonLines } from "../io/jsonl.js";
import { CandidateSchema, TaskSchema } from "../schemas/domain.js";

async function main() {
  const tasks = await readJsonLines("data/tasks/tasks.jsonl", TaskSchema);
  const candidates = await readJsonLines("data/candidates/candidates.jsonl", CandidateSchema);
  const template = buildVerbosityTemplate({ tasks, candidates });
  await writeJsonLines("data/candidates/verbosity.template.jsonl", template);
  console.log(`Wrote ${template.length} verbosity control drafts. Review and fill longCandidate.text before finalizing.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack ?? error.message);
    process.exitCode = 1;
  });
}

export { main };
