import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { JudgeOutputSchema } from "../schemas/domain.js";
import {
  CANDIDATE_GENERATOR_MODELS,
  DEFAULT_JUDGE_MODEL_KEY,
  getJudgeModel,
} from "../config/models.js";

export const JUDGE_MODEL = getJudgeModel(DEFAULT_JUDGE_MODEL_KEY).model;
export const JUDGE_MAX_TOKENS = 400;
export const GENERATOR_MAX_TOKENS = 300;
export const CANDIDATE_TEMPERATURES = Object.freeze({ a: 0.7, b: 0.7 });

const BASELINE_JUDGE_SYSTEM_PROMPT = `You are an impartial evaluator of two answers to a task.
Use only the supplied source passage and task instructions. Do not use outside knowledge.
Score each answer for correctness, relevance, completeness, and unsupported claims.
Choose the better answer or a tie, then briefly explain the decision.
Return only the requested structured output.`;

const ANCHORED_JUDGE_SYSTEM_PROMPT = `You are an impartial, source-grounded evaluator of two answers.
Use only the supplied source passage and task instructions; do not use outside knowledge.

Score each answer using these anchors:
- correctness: 0 incorrect, 1 partly correct, 2 correct
- relevance: 0 off-task, 1 partly relevant, 2 relevant
- completeness: 0 major omissions, 1 minor omissions, 2 complete
- unsupported_claims: true when the answer presents a claim that the supplied passage does not support

Choose between answers using this priority: correctness, absence of unsupported claims, completeness, relevance.
If the candidates are equal under that priority, choose a tie. Keep the explanation short.
Return only the requested structured output.`;

function judgeSystemPrompt(promptVersion) {
  if (promptVersion === "baseline") return BASELINE_JUDGE_SYSTEM_PROMPT;
  if (promptVersion === "anchored") return ANCHORED_JUDGE_SYSTEM_PROMPT;
  throw new Error(`Unknown judge prompt version: ${promptVersion}`);
}

function renderTask(task) {
  return [
    "<source_passage>",
    task.passage,
    "</source_passage>",
    "<task_instructions>",
    task.instruction,
    "</task_instructions>",
  ].join("\n");
}

function renderJudgeMessage(task, candidateA, candidateB) {
  return [
    renderTask(task),
    "<candidate_a>",
    candidateA.text,
    "</candidate_a>",
    "<candidate_b>",
    candidateB.text,
    "</candidate_b>",
    "Evaluate candidate A and candidate B independently, then return the structured judgment.",
  ].join("\n");
}

/**
 * Builds the exact request body used by both synchronous smoke tests and batch requests.
 */
export function buildJudgeParams({ task, candidateA, candidateB, promptVersion, modelKey = DEFAULT_JUDGE_MODEL_KEY }) {
  return {
    model: getJudgeModel(modelKey).model,
    max_tokens: JUDGE_MAX_TOKENS,
    temperature: 0,
    system: judgeSystemPrompt(promptVersion),
    messages: [{ role: "user", content: renderJudgeMessage(task, candidateA, candidateB) }],
    output_config: { format: zodOutputFormat(JudgeOutputSchema) },
  };
}

export function buildCandidateGenerationParams({
  task,
  modelKey = CANDIDATE_GENERATOR_MODELS.a,
  temperature = CANDIDATE_TEMPERATURES.a,
}) {
  return {
    model: getJudgeModel(modelKey).model,
    max_tokens: GENERATOR_MAX_TOKENS,
    temperature,
    messages: [
      {
        role: "user",
        content: [
          "Answer the following task using only the supplied source passage.",
          "Do not mention this instruction or invent facts not supported by the passage.",
          renderTask(task),
        ].join("\n"),
      },
    ],
  };
}
