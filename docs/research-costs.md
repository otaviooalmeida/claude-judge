# API cost and benchmark research

Primary-source findings gathered during project planning. Prices, model availability, and account funding requirements must be rechecked before paid execution. No paid inference was run during this research.

## Anthropic

- Standard Console usage is prepaid; credits expire after one year and purchases are non-refundable. Auto-reload can purchase additional credits automatically. The fetched billing help article did not specify a minimum credit purchase, so the account checkout amount and any taxes remain unverified. Do not assume a $5 all-in purchase is available. [Billing help](https://support.claude.com/en/articles/8977456-how-do-i-pay-for-my-claude-api-usage)

- Haiku 4.5 standard token prices: $1 per million input tokens and $5 per million output tokens. Batch prices: $0.50 input and $2.50 output. [Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Sonnet 4.6 is addressed as `claude-sonnet-4-6`. Its documented standard prices are $3 per million input tokens and $15 per million output tokens; batch prices are $1.50 input and $7.50 output. [Sonnet 4.6 overview](https://platform.claude.com/docs/en/models/sonnet-4-6/overview) · [Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Message Batches give a 50% input/output discount and independently process individual requests. Allow up to 24 hours; batches may slightly exceed workspace spend limits because of concurrent processing. [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- Haiku 4.5 requires a 4,096-token cacheable prefix. Five-minute writes cost 1.25x normal input, one-hour writes 2x, and reads 0.1x. Short prompts may not benefit; do not assume caching savings. [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- Native structured JSON uses output_config.format; TypeScript/JavaScript SDK helpers support Zod schemas. Structured outputs add input overhead and still need refusal, truncation, and local validation handling. Schema compliance is not judgment correctness. [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- Token counting is free, subject to rate limits. [Token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting)

## OpenAI and the user's ChatGPT Plus subscription

Decision: do not include an OpenAI model in this project. Findings below are retained as research history, not as an implementation plan.

- ChatGPT Plus covers the ChatGPT application, not API usage. API usage is separately billed. [What is ChatGPT Plus?](https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus)
- New API accounts use prepaid billing; the minimum initial credit purchase is $5. The documentation states auto-reload is enabled by default during setup; disable it for a bounded spending plan. Purchased credits expire after one year. Provider balance enforcement can lag, so it is not an instantaneous cutoff. [Prepaid billing](https://help.openai.com/en/articles/8264644-how-can-i-set-up-prepaid-billing)
- GPT-5.6 Luna is documented as a cost-sensitive model with structured output support. Listed standard rates are $0.20 per million input tokens and $1.20 per million output tokens. It supports reasoning effort none, low, medium (default), high, xhigh, and max. No account-specific model access has been verified. [Model documentation](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
- Illustrative arithmetic: 200 requests at 1,200 input and 200 billed output tokens each would cost $0.096 at those standard rates, excluding additional reasoning, retries, and other charges. This is a usage estimate, not the amount needed to fund a new account.

## Methodological grounding

The MT-Bench paper discusses position, verbosity, and self-enhancement biases and evaluation against human preferences. It motivates testing these effects rather than assuming they occur for this project's configurations. [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685)

## Recommendations, not source claims

- Spend money on fresh judgments, not repeated generation or UI demos.
- Reuse saved responses for development; intentional repeatability trials require fresh inference, not result-cache hits.
- Keep task-level uncertainty separate from repeated judgments of the same task.
- Compare each judge with independent human labels; agreement between two models does not establish correctness.
- Compare Sonnet as a secondary judge of the same frozen candidates before expanding candidate generation. This keeps the Claude SDK central and avoids a larger factorial design.
- Do not treat model agreement as ground truth; compare both models with the independent human labels.
- Do not treat manually collected ChatGPT app outputs as controlled API-equivalent observations. Model settings and hidden application behavior may differ.
