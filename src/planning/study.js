const CATEGORIES = [
  "factual_qa",
  "constrained_summary",
  "structured_extraction",
  "insufficient_evidence",
];

export function selectVerbosityTasks(tasks) {
  return CATEGORIES.flatMap((category) => tasks
    .filter((task) => task.split === "evaluation" && task.category === category)
    .slice(0, 5));
}
