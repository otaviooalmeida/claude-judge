import { CandidateSchema, JudgeOutputSchema, JudgmentRecordSchema, toDomainScorecard } from "../schemas/domain.js";
import { derivePreference } from "../domain/preference.js";
import { CANDIDATE_GENERATOR_MODELS, DEFAULT_JUDGE_MODEL_KEY, getJudgeModel } from "../config/models.js";
import {
  buildCandidateGenerationParams,
  buildJudgeParams,
  CANDIDATE_TEMPERATURES,
} from "./anthropic-params.js";

function normalizeUsage(usage = {}) {
  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
    cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
  };
}

export function judgmentRecordFromStructuredResponse({
  trial,
  candidateA,
  candidateB,
  output,
  response,
  modelKey = DEFAULT_JUDGE_MODEL_KEY,
}) {
  const model = getJudgeModel(modelKey);
  const parsedOutput = JudgeOutputSchema.parse(output);
  const domainCandidateA = toDomainScorecard(parsedOutput.candidate_a);
  const domainCandidateB = toDomainScorecard(parsedOutput.candidate_b);
  const record = {
    trialId: trial.customId,
    taskId: trial.taskId,
    judgeModelKey: model.key,
    judgeModel: model.model,
    kind: trial.kind,
    promptVersion: trial.promptVersion,
    presentationOrder: trial.presentationOrder,
    candidateAId: candidateA.id,
    candidateBId: candidateB.id,
    candidateA: domainCandidateA,
    candidateB: domainCandidateB,
    declaredPreference: parsedOutput.declared_preference,
    ruleDerivedPreference: derivePreference(domainCandidateA, domainCandidateB),
    explanation: parsedOutput.explanation,
    status: response.stop_reason === "max_tokens" ? "truncated" : "completed",
    stopReason: response.stop_reason ?? null,
    usage: normalizeUsage(response.usage),
  };

  return JudgmentRecordSchema.parse(record);
}

export async function judgeCandidatePair({ client, task, candidateA, candidateB, trial, modelKey = DEFAULT_JUDGE_MODEL_KEY }) {
  const response = await client.messages.parse(
    buildJudgeParams({ task, candidateA, candidateB, promptVersion: trial.promptVersion, modelKey }),
  );

  if (!response.parsed_output) {
    throw new Error(`Trial ${trial.customId} returned no parsed structured output`);
  }

  return judgmentRecordFromStructuredResponse({
    trial,
    candidateA,
    candidateB,
    output: response.parsed_output,
    response,
    modelKey,
  });
}

export async function generateCandidate({ client, task, candidateId, generationIndex }) {
  const suffix = generationIndex === 1 ? "b" : "a";
  const modelKey = CANDIDATE_GENERATOR_MODELS[suffix];
  const generationTemperature = CANDIDATE_TEMPERATURES[suffix];
  const response = await client.messages.create(buildCandidateGenerationParams({
    task,
    modelKey,
    temperature: generationTemperature,
  }));
  const text = response.content?.find((block) => block.type === "text")?.text?.trim();
  if (!text) {
    throw new Error(`Generation ${task.id}-${generationIndex} returned no text response`);
  }

  const candidate = CandidateSchema.parse({
    id: candidateId,
    taskId: task.id,
    text,
    model: getJudgeModel(modelKey).model,
    generationTemperature,
  });

  return {
    candidate,
    truncated: response.stop_reason === "max_tokens",
    stopReason: response.stop_reason ?? null,
    usage: normalizeUsage(response.usage),
  };
}

export { normalizeUsage };
