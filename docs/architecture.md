# Architecture

```text
                 ┌─────────────────────┐
                 │ data/tasks/*.jsonl  │
                 │ human-reviewed      │
                 └──────────┬──────────┘
                            │
                 ┌──────────▼──────────┐
                 │ Offline plan + cost │
                 │ no API key required │
                 └───────┬───────┬─────┘
                         │       │
          explicit gate  │       │ explicit gate
                         │       │
             ┌───────────▼─┐   ┌─▼────────────────┐
             │ Candidate   │   │ Judge trial plan │
             │ batch       │   │ baseline/anchored│
             └──────┬──────┘   └───────┬──────────┘
                    │                  │
             candidates/*.jsonl        │
                    │          ┌───────▼──────────┐
                    └─────────►│ Anthropic Batch  │
                               │ official SDK    │
                               │ structured JSON │
                               │ Haiku + Sonnet  │
                               └───────┬──────────┘
                                       │ custom_id
                               ┌───────▼──────────┐
                               │ Result reader    │
                               │ no silent retry  │
                               └───────┬──────────┘
                                       │
                        ┌──────────────▼──────────────┐
                        │ Haiku/Sonnet JSONL + analysis│
                        │ identity alignment + stats  │
                        └──────────────┬──────────────┘
                                       │
                               ┌───────▼──────────┐
                               │ public/index.html│
                               │ static dashboard │
                               └──────────────────┘
```

## Boundaries

- **Domain:** preference policy and metrics are pure functions and do not know about the Anthropic SDK.
- **Schemas:** Zod defines the task, candidate, human-label, structured judge output, and judgment-record contracts.
- **Planning:** builds the pre-registered request matrix and conservative batch cost estimate.
- **SDK adapter:** the only layer that constructs Anthropic client calls and request parameters.
- **Storage:** JSONL makes intermediate artifacts inspectable, resumable, and easy to archive.
- **Reporting:** consumes saved artifacts only; the static dashboard cannot trigger inference. It loads `judgments-haiku.jsonl` and `judgments-sonnet.jsonl` separately and compares their metrics side by side.

This separation makes it possible to run all tests, inspect prompts, review data, and build the dashboard without an API key.
