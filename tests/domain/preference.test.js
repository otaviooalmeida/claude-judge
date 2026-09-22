import { describe, expect, it } from "vitest";
import { derivePreference } from "../../src/domain/preference.js";

const score = ({ correctness, relevance, completeness, unsupportedClaims = false }) => ({
  correctness,
  relevance,
  completeness,
  unsupportedClaims,
});

describe("derivePreference", () => {
  it("prioritizes correctness over every other criterion", () => {
    expect(
      derivePreference(
        score({ correctness: 2, relevance: 0, completeness: 0, unsupportedClaims: true }),
        score({ correctness: 1, relevance: 2, completeness: 2 }),
      ),
    ).toBe("a");
  });

  it("prefers the candidate without unsupported claims when correctness ties", () => {
    expect(
      derivePreference(
        score({ correctness: 2, unsupportedClaims: false }),
        score({ correctness: 2, unsupportedClaims: true, completeness: 2, relevance: 2 }),
      ),
    ).toBe("a");
  });

  it("uses completeness and then relevance as tie breakers", () => {
    expect(
      derivePreference(
        score({ correctness: 1, completeness: 2, relevance: 0 }),
        score({ correctness: 1, completeness: 1, relevance: 2 }),
      ),
    ).toBe("a");

    expect(
      derivePreference(
        score({ correctness: 1, completeness: 1, relevance: 2 }),
        score({ correctness: 1, completeness: 1, relevance: 1 }),
      ),
    ).toBe("a");
  });

  it("returns a tie when the candidates have equal priority", () => {
    expect(
      derivePreference(
        score({ correctness: 2, completeness: 1, relevance: 1 }),
        score({ correctness: 2, completeness: 1, relevance: 1 }),
      ),
    ).toBe("tie");
  });
});
