import { describe, expect, it } from "vitest";
import { buildVerbosityTemplate, finalizeVerbosityTemplate } from "../../src/annotation/verbosity.js";

const tasks = [
  { id: "fact-01", split: "evaluation", category: "factual_qa" },
  ...Array.from({ length: 4 }, (_, index) => ({ id: `fact-${index + 2}`, split: "evaluation", category: "factual_qa" })),
  ...Array.from({ length: 5 }, (_, index) => ({ id: `summary-${index + 1}`, split: "evaluation", category: "constrained_summary" })),
  ...Array.from({ length: 5 }, (_, index) => ({ id: `extract-${index + 1}`, split: "evaluation", category: "structured_extraction" })),
  ...Array.from({ length: 5 }, (_, index) => ({ id: `insufficient-${index + 1}`, split: "evaluation", category: "insufficient_evidence" })),
];
const candidates = tasks.map((task) => ({
  id: `${task.id}-a`, taskId: task.id, text: `Answer for ${task.id}`, model: "haiku",
}));

describe("verbosity controls", () => {
  it("selects five tasks per category and preserves the short source text", () => {
    const template = buildVerbosityTemplate({ tasks, candidates });
    expect(template).toHaveLength(20);
    expect(template[0]).toMatchObject({
      taskId: "fact-01",
      shortCandidate: { id: "fact-01-short", text: "Answer for fact-01" },
      longCandidate: { id: "fact-01-long", text: null },
    });
  });

  it("only finalizes a control after a non-empty expanded response is supplied", () => {
    const template = buildVerbosityTemplate({ tasks, candidates });
    expect(() => finalizeVerbosityTemplate(template)).toThrow(/expanded/i);

    const finalized = finalizeVerbosityTemplate(template.map((item) => ({
      ...item,
      longCandidate: { ...item.longCandidate, text: `${item.shortCandidate.text} With more words.` },
    })));
    expect(finalized).toHaveLength(40);
  });
});
