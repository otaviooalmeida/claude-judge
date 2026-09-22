import Anthropic from "@anthropic-ai/sdk";

export function createAnthropicClient({ apiKey = process.env.ANTHROPIC_API_KEY } = {}) {
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required for paid execution");
  }
  return new Anthropic({ apiKey });
}
