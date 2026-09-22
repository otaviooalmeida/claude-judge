function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function percentage(value) {
  return value == null ? "Unavailable" : `${(value * 100).toFixed(1)}%`;
}

function metric(value, digits = 3) {
  return value == null ? "Unavailable" : Number(value).toFixed(digits);
}

function interval(value) {
  return value == null ? "Unavailable" : `${percentage(value[0])}–${percentage(value[1])}`;
}

function promptRow(modelLabel, prompt, summary) {
  return `<tr><td>${escapeHtml(modelLabel)}</td><td>${escapeHtml(prompt)}</td><td>${summary.denominator}</td><td>${percentage(summary.preferenceAgreement)}</td><td>${interval(summary.preferenceAgreementInterval)}</td><td>${metric(summary.cohenKappa)}</td><td>$${summary.actualBatchCostUsd.toFixed(4)}</td></tr>`;
}

function modelLabel(modelKey, modelSummary) {
  return modelSummary.model ?? (modelKey === "sonnet" ? "claude-sonnet-4-6" : "claude-haiku-4-5-20251001");
}

function renderCase(item) {
  const candidateText = item.candidates?.length
    ? item.candidates.map((candidate) => `<h4>${escapeHtml(candidate.id)}</h4><pre>${escapeHtml(candidate.text)}</pre>`).join("")
    : "<p>No frozen candidates saved.</p>";
  const human = item.human
    ? `<p><strong>Human preference:</strong> ${escapeHtml(item.human.preference)}</p>`
    : "<p>No human evaluation saved.</p>";
  const judgmentCount = item.judgments?.length ?? 0;
  return `<details><summary>${escapeHtml(item.taskId)} · ${escapeHtml(item.category)}</summary><p><strong>Task:</strong> ${escapeHtml(item.instruction)}</p><p><strong>Source:</strong> ${escapeHtml(item.passage)}</p>${candidateText}${human}<p><strong>Saved Claude judgments:</strong> ${judgmentCount}</p></details>`;
}

export function renderDashboard({ summary, metadata = {}, cases = [] }) {
  const fallbackModel = {
    model: metadata.model ?? "claude-haiku-4-5-20251001",
    byPrompt: summary.byPrompt ?? {},
    biasByPrompt: summary.biasByPrompt ?? {},
  };
  const models = summary.byModel ?? { haiku: fallbackModel };
  const emptyBias = { repeatability: null, positionChangeRate: null, verbosity: { longerWins: 0, shorterWins: 0, ties: 0, total: 0 } };
  const modelRows = Object.entries(models).flatMap(([modelKey, modelSummary]) => ["baseline", "anchored"].map((promptVersion) => promptRow(
    modelLabel(modelKey, modelSummary),
    promptVersion,
    modelSummary.byPrompt?.[promptVersion] ?? { denominator: 0, preferenceAgreement: null, preferenceAgreementInterval: null, cohenKappa: null, actualBatchCostUsd: 0 },
  ))).join("");
  const biasRows = Object.entries(models).flatMap(([modelKey, modelSummary]) => ["baseline", "anchored"].map((promptVersion) => {
    const bias = modelSummary.biasByPrompt?.[promptVersion] ?? emptyBias;
    return `<tr><td>${escapeHtml(modelLabel(modelKey, modelSummary))}</td><td>${escapeHtml(promptVersion)}</td><td>${percentage(bias.repeatability)}</td><td>${percentage(bias.positionChangeRate)}</td><td>${bias.verbosity.longerWins}</td><td>${bias.verbosity.shorterWins}</td><td>${bias.verbosity.ties}</td></tr>`;
  })).join("");
  const modelNames = Object.values(models).map((modelSummary) => modelSummary.model).filter(Boolean).join(" + ");
  const serialized = JSON.stringify({ summary, metadata }).replaceAll("<", "\\u003c");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Can Claude Judge Claude?</title>
<style>
:root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; --ink:#172033; --muted:#5c677d; --line:#d9dfeb; --panel:#fff; --accent:#6c4ce6; --bg:#f5f7fb; }
* { box-sizing:border-box; } body { margin:0; color:var(--ink); background:var(--bg); line-height:1.5; }
main { max-width:1100px; margin:0 auto; padding:48px 24px 80px; } h1 { margin:0 0 8px; font-size:clamp(2rem,5vw,3.5rem); } h2 { margin-top:40px; } h3 { margin:0 0 6px; } p { color:var(--muted); } .eyebrow { color:var(--accent); font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
.grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:14px; } .card, .panel { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:18px; box-shadow:0 5px 18px #24355b0d; } .value { font-size:1.8rem; font-weight:750; } .label { color:var(--muted); font-size:.9rem; }
table { border-collapse:collapse; width:100%; background:var(--panel); border:1px solid var(--line); border-radius:14px; overflow:hidden; } th,td { text-align:left; padding:12px 14px; border-bottom:1px solid var(--line); } th { background:#f0f2f8; font-size:.85rem; } tr:last-child td { border-bottom:0; }
.tag { display:inline-block; border-radius:999px; padding:3px 9px; background:#ede9fe; color:#5138b7; font-size:.8rem; font-weight:700; } code { background:#eef1f7; border-radius:5px; padding:2px 5px; } .note { border-left:4px solid var(--accent); padding-left:14px; }
</style>
</head>
<body>
<main>
  <div class="eyebrow">Reproducible exploratory benchmark</div>
  <h1>Can Claude Judge Claude?</h1>
  <p>Comparing Claude models as automated judges of the same frozen Claude-generated answers.</p>
  <div class="grid">
    <div class="card"><div class="label">Total judgments</div><div class="value">${summary.totalJudgments ?? 0}</div></div>
    <div class="card"><div class="label">Completed</div><div class="value">${summary.completedJudgments ?? 0}</div></div>
    <div class="card"><div class="label">Failed / incomplete</div><div class="value">${summary.failedJudgments ?? 0}</div></div>
    <div class="card"><div class="label">Judge models</div><div class="value" style="font-size:1rem">${escapeHtml(modelNames || metadata.model || "Not run")}</div></div>
  </div>

  <h2>Findings</h2>
  <div class="panel">
    <p class="note">Agreement is compared with one human annotator's labels. A model can be repeatable while being consistently wrong; agreement is not validity.</p>
    <table><thead><tr><th>Judge model</th><th>Prompt</th><th>n</th><th>Preference agreement</th><th>95% Wilson interval</th><th>Cohen's κ</th><th>Recorded batch cost</th></tr></thead>
    <tbody>${modelRows}</tbody></table>
  </div>

  <h2>Bias and stability</h2>
  <div class="panel">
    <p>Position sensitivity, verbosity sensitivity, and repeatability are computed from fresh trials and mapped back to candidate identity. These measurements are included in the saved analysis when the main experiment has completed.</p>
    <table><thead><tr><th>Judge model</th><th>Prompt</th><th>Repeatability</th><th>Position change rate</th><th>Longer wins</th><th>Shorter wins</th><th>Ties</th></tr></thead>
    <tbody>${biasRows}</tbody></table>
    <span class="tag">Temperature 0 judge</span> <span class="tag">Batch API</span> <span class="tag">Structured JSON</span>
  </div>

  <h2>Case explorer</h2>
  <div class="panel">
    <p>Explore individual source passages, candidate responses, pre-registered human labels, and Claude judgments from saved artifacts. The report is generated from saved results and never calls an API from the browser.</p>
    ${cases.length ? cases.map(renderCase).join("\n") : "<p>No cases are available yet. Generate candidates and record human labels before the measured run.</p>"}
  </div>

  <h2>Methodology</h2>
  <div class="panel">
    <ul>
      <li>48 source-grounded synthetic tasks: 8 calibration and 40 held-out evaluation tasks.</li>
      <li>Two prompt versions: a baseline and an anchored rubric.</li>
      <li>Correctness, relevance, completeness, unsupported claims, and a declared preference.</li>
      <li>Human labels are recorded before automated judgments and reference answers are hidden from the judge.</li>
      <li>Conclusions are exploratory and specific to the pinned model, prompts, and dataset.</li>
    </ul>
    <p>Dataset provenance: ${escapeHtml(metadata.provenance ?? "AI-assisted, human-reviewed synthetic dataset")}. Report generated: ${escapeHtml(metadata.generatedAt ?? "not recorded")}.</p>
  </div>
</main>
<script type="application/json" id="report-data">${serialized}</script>
</body>
</html>
`;
}
