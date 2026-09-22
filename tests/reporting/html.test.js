import { describe, expect, it } from "vitest";
import { renderDashboard } from "../../src/reporting/html.js";

describe("static dashboard renderer", () => {
  it("renders recruiter-facing sections from saved analysis", () => {
    const html = renderDashboard({
      summary: {
        totalJudgments: 2,
        completedJudgments: 2,
        failedJudgments: 0,
        byPrompt: {
          baseline: { denominator: 1, preferenceAgreement: 1, cohenKappa: null, actualBatchCostUsd: 0.01 },
          anchored: { denominator: 1, preferenceAgreement: 0, cohenKappa: null, actualBatchCostUsd: 0.02 },
        },
      },
      metadata: { model: "claude-haiku-4-5-20251001", provenance: "fixture" },
      cases: [{
        taskId: "task-01",
        category: "factual_qa",
        instruction: "What happened?",
        passage: "A source passage.",
        candidates: [{ id: "task-01-a", text: "An answer." }],
        human: { preference: "a" },
        judgments: [{ trialId: "trial-1" }],
      }],
    });

    expect(html).toContain("Can Claude Judge Claude?");
    expect(html).toContain("Findings");
    expect(html).toContain("Bias and stability");
    expect(html).toContain("Case explorer");
    expect(html).toContain("Methodology");
    expect(html).toContain("claude-haiku-4-5-20251001");
    expect(html).toContain("A source passage.");
    expect(html).toContain("An answer.");
  });

  it("renders separate Haiku and Sonnet rows", () => {
    const empty = { denominator: 0, preferenceAgreement: null, preferenceAgreementInterval: null, cohenKappa: null, actualBatchCostUsd: 0 };
    const html = renderDashboard({
      summary: {
        totalJudgments: 0,
        completedJudgments: 0,
        failedJudgments: 0,
        byModel: {
          haiku: { model: "claude-haiku-4-5-20251001", byPrompt: { baseline: empty, anchored: empty }, biasByPrompt: {} },
          sonnet: { model: "claude-sonnet-4-6", byPrompt: { baseline: empty, anchored: empty }, biasByPrompt: {} },
        },
      },
    });

    expect(html).toContain("claude-haiku-4-5-20251001");
    expect(html).toContain("claude-sonnet-4-6");
  });

  it("escapes embedded metadata before placing it in HTML", () => {
    const html = renderDashboard({
      summary: { totalJudgments: 0, completedJudgments: 0, failedJudgments: 0, byPrompt: {} },
      metadata: { provenance: "</script><script>alert('xss')</script>" },
    });

    expect(html).not.toContain("</script><script>alert");
  });
});
