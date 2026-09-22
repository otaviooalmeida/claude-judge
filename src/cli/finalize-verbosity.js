import { pathToFileURL } from "node:url";
import { finalizeVerbosityTemplate } from "../annotation/verbosity.js";
import { readJsonLines, writeJsonLines } from "../io/jsonl.js";

async function main() {
  const template = await readJsonLines("data/candidates/verbosity.template.jsonl");
  const candidates = finalizeVerbosityTemplate(template);
  await writeJsonLines("data/candidates/verbosity.jsonl", candidates);
  console.log(`Wrote ${candidates.length} reviewed verbosity candidates.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack ?? error.message);
    process.exitCode = 1;
  });
}

export { main };
