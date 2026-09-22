import { z } from "zod";

const identifier = z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/);
const score = z.number().int().min(0).max(2);

export const TaskCategorySchema = z.enum([
  "factual_qa",
  "constrained_summary",
  "structured_extraction",
  "insufficient_evidence",
]);

export const TaskSchema = z.object({
  id: identifier,
  split: z.enum(["calibration", "evaluation"]).default("evaluation"),
  category: TaskCategorySchema,
  passage: z.string().min(1),
  instruction: z.string().min(1),
  referenceChecklist: z.array(z.string().min(1)).min(1),
}).strict();

export const CandidateSchema = z.object({
  id: identifier,
  taskId: identifier,
  text: z.string().min(1),
  model: z.string().min(1),
  generationTemperature: z.number().min(0).max(1).optional(),
}).strict();

export const ScorecardSchema = z.object({
  correctness: score,
  relevance: score,
  completeness: score,
  unsupportedClaims: z.boolean(),
}).strict();

export const PreferenceSchema = z.enum(["a", "b", "tie"]);

export const JudgeScorecardSchema = z.object({
  correctness: score,
  relevance: score,
  completeness: score,
  unsupported_claims: z.boolean(),
}).strict();

export const JudgeOutputSchema = z.object({
  candidate_a: JudgeScorecardSchema,
  candidate_b: JudgeScorecardSchema,
  declared_preference: PreferenceSchema,
  explanation: z.string().min(1).max(1000),
}).strict();

export const HumanEvaluationSchema = z.object({
  taskId: identifier,
  candidateAId: identifier,
  candidateBId: identifier,
  candidateA: ScorecardSchema,
  candidateB: ScorecardSchema,
  preference: PreferenceSchema,
}).strict();

export const JudgmentRecordSchema = z.object({
  trialId: identifier,
  taskId: identifier,
  judgeModelKey: z.enum(["haiku", "sonnet"]),
  judgeModel: z.string().min(1),
  kind: z.enum(["calibration", "repeatability", "position", "verbosity"]),
  promptVersion: z.enum(["baseline", "anchored"]),
  presentationOrder: z.string().min(1),
  candidateAId: identifier,
  candidateBId: identifier,
  candidateA: ScorecardSchema,
  candidateB: ScorecardSchema,
  declaredPreference: PreferenceSchema,
  ruleDerivedPreference: PreferenceSchema,
  explanation: z.string().min(1).max(1000),
  status: z.enum(["completed", "truncated"]),
  stopReason: z.string().nullable(),
  usage: z.object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    cacheCreationInputTokens: z.number().int().nonnegative(),
    cacheReadInputTokens: z.number().int().nonnegative(),
  }).strict(),
}).strict();

export function toDomainScorecard(scorecard) {
  return {
    correctness: scorecard.correctness,
    relevance: scorecard.relevance,
    completeness: scorecard.completeness,
    unsupportedClaims: scorecard.unsupported_claims,
  };
}
