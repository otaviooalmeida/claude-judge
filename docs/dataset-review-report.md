# Dataset review report

Review completed against [`dataset-review.md`](./dataset-review.md) for all 48 records in `data/tasks/tasks.jsonl`.

## Result

- 48 tasks parse successfully with `TaskSchema`.
- 8 calibration tasks and 40 evaluation tasks.
- 12 tasks in each category: 2 calibration and 10 evaluation.
- Every factual, summary, and extraction checklist item is supported by its passage.
- Every insufficient-evidence request asks for information explicitly absent from its passage.
- Instructions are source-grounded and do not require outside knowledge.
- Category assignments are appropriate.
- Summary constraints and extraction requirements are represented in the checklists.

## Correction made

- Removed an accidental double space in the calibration factual passage `cal-factual-01` (`with  forty` → `with forty`).

## Preselected verbosity controls

The 20 controls selected before any judge output are:

- `factual-01` through `factual-05`
- `summary-01` through `summary-05`
- `extract-01` through `extract-05`
- `insufficient-01` through `insufficient-05`

This review does not create the concise/expanded responses. Those must be drafted from frozen candidates and checked for substantive equivalence using `npm run verbosity:template` and `npm run verbosity:finalize`.

## Remaining human gate

This is an assistant review, not an independent human annotation. The project still requires the owner to review the passages and checklists before purchasing credits or running paid candidate generation. The reference checklists must never be sent to the judge.
