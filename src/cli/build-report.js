import { access, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { analyzeJudgments } from "../reporting/analyze.js";
import { renderDashboard } from "../reporting/html.js";
import { readJsonLines } from "../io/jsonl.js";
import { CandidateSchema, HumanEvaluationSchema, TaskSchema } from "../schemas/domain.js";

const TASK_PATH = "data/tasks/tasks.jsonl";
const CANDIDATE_PATH = "data/candidates/candidates.jsonl";
const HUMAN_PATH = "data/human/evaluations.jsonl";
const JUDGMENT_PATHS = [
  "data/results/judgments-haiku.jsonl",
  "data/results/judgments-sonnet.jsonl",
];
const PLAN_PATH = "data/results/plan.json";
const OUTPUT_PATH = "public/index.html";

async function readIfPresent(path, fallback, schema = null) {
  try {
    await access(path);
    return await readJsonLines(path, schema);
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function main() {
  const tasks = await readJsonLines(TASK_PATH, TaskSchema);
  const candidates = await readIfPresent(CANDIDATE_PATH, [], CandidateSchema);
  const verbosityCandidates = await readIfPresent("data/candidates/verbosity.jsonl", [], CandidateSchema);
  const allCandidates = [...candidates, ...verbosityCandidates];
  const humanEvaluations = await readIfPresent(HUMAN_PATH, [], HumanEvaluationSchema);
  const judgmentFiles = await Promise.all(JUDGMENT_PATHS.map((path) => readIfPresent(path, [])));
  const judgments = judgmentFiles.flat();
  let plan = null;
  try {
    plan = JSON.parse(await readFile(PLAN_PATH, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const summary = analyzeJudgments({ humanEvaluations, judgments });
  const candidatesByTask = Map.groupBy(allCandidates, (candidate) => candidate.taskId);
  const humanByTask = new Map(humanEvaluations.map((evaluation) => [evaluation.taskId, evaluation]));
  const judgmentsByTask = Map.groupBy(judgments, (judgment) => judgment.taskId);
  const cases = tasks.map((task) => ({
    taskId: task.id,
    category: task.category,
    instruction: task.instruction,
    passage: task.passage,
    candidates: candidatesByTask.get(task.id) ?? [],
    human: humanByTask.get(task.id) ?? null,
    judgments: judgmentsByTask.get(task.id) ?? [],
  }));
  const metadata = {
    model: plan?.judgeModels
      ? Object.values(plan.judgeModels).map((model) => model.model).join(" + ")
      : "Not run", 
    provenance: "AI-assisted, human-reviewed synthetic dataset",
    generatedAt: new Date().toISOString(),
  };

  await writeFile(OUTPUT_PATH, renderDashboard({ summary, metadata, cases }), "utf8");
  console.log(JSON.stringify({ output: OUTPUT_PATH, cases: cases.length, humanEvaluations: humanEvaluations.length, judgments: judgments.length, models: Object.keys(summary.byModel) }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack ?? error.message);
    process.exitCode = 1;
  });
}

export { main };
