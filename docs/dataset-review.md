# Dataset review checklist

Before any paid run, review `data/tasks/tasks.jsonl` line by line.

For each task:

- Confirm the passage is internally coherent and contains enough evidence for the instruction.
- Confirm every reference-checklist item is supported by the passage.
- Confirm the category matches the behavior being tested.
- Confirm the instruction does not require outside knowledge.
- For `insufficient_evidence`, confirm the requested fact is genuinely absent.
- For summaries and extraction tasks, confirm each requirement is observable in the checklist.

Record corrections directly in `data/tasks/tasks.jsonl` and rerun the offline validation command. Do not expose `referenceChecklist` to the judge.

For verbosity controls:

1. Select five evaluation tasks per category before inspecting judge outputs.
2. Create a concise and an expanded response for each selected task.
3. Verify that the expansion adds wording or organization, not substantive facts.
4. Store the reviewed pairs with candidate metadata and mark which candidate is short/long.
5. Keep these controls separate from the natural candidate pairs in the report.
