# Can Claude Judge Claude?

An exploratory benchmark of automated judgments of model-generated responses to source-grounded tasks.

## Language

**Task**:
A question or instruction accompanied by a source passage and explicit response requirements.

**Candidate response**:
A model-generated answer to a task that is preserved for subsequent evaluation.
_Avoid_: Reference answer

**Reference answer**:
An independently checked answer or checklist describing what a satisfactory response to a task should contain.
_Avoid_: Human evaluation

**Human evaluation**:
The human annotator's criterion scores for candidate responses and preference between them, recorded before seeing automated judgments.
_Avoid_: Ground truth, reference answer

**Judge**:
A model configured with instructions and criteria to evaluate candidate responses.

**Judgment**:
An automated evaluation comprising correctness, relevance, and completeness scores for each candidate, an unsupported-claims flag for each candidate, a preferred candidate or tie, and a short explanation.
_Avoid_: Human evaluation

**Correctness**:
The extent to which a candidate's answer is accurate for the task given the source passage.

**Relevance**:
The extent to which a candidate's content addresses the task.

**Completeness**:
The extent to which a candidate covers the task's required information and instructions.

**Unsupported claim**:
An assertion presented as established even though the supplied source does not support it.
_Avoid_: Falsehood (an unsupported claim need not be false outside the source)

**Preferred candidate**:
The response favored by comparing correctness first, then absence of unsupported claims, then completeness, then relevance. Equal rankings produce a tie.

**Declared preference**:
The candidate preference or tie explicitly returned by a judge.

**Rule-derived preference**:
The preference computed from criterion scores and unsupported-claims flags using the agreed priority rule.

**Evaluation trial**:
One fresh judgment of a candidate pair under a specified prompt, presentation order, and judge configuration.
_Avoid_: Independent task

**Verbosity control pair**:
A concise response and an expanded response checked by a human to preserve the same substantive content.

**Calibration set**:
The eight tasks used to develop judge prompts, kept separate from tasks used for reported evaluation.

**Evaluation set**:
The 40 manually reviewed tasks reserved for evaluation after judge prompts are frozen.

**Repeatability**:
The stability of judgments across fresh evaluations with identical inputs and settings.
_Avoid_: Correctness

**Position sensitivity**:
A change in judgment associated with swapping candidate presentation order, after mapping preferences back to candidate identity.

**Verbosity sensitivity**:
A change in judgment associated with response length when substantive content is held constant.
