import { describe, expect, it } from "vitest";
import {
  cohenKappa,
  confusionMatrix,
  meanAbsoluteError,
  positionChangeRate,
  repeatabilityRate,
  verbosityOutcomes,
  wilsonInterval,
} from "../../src/domain/metrics.js";

describe("benchmark metrics", () => {
  it("calculates preference agreement and chance-adjusted kappa", () => {
    const human = ["a", "a", "b", "tie"];
    const judge = ["a", "b", "b", "tie"];

    expect(cohenKappa(human, judge)).toBeCloseTo(0.63636, 4);
  });

  it("returns null for undefined kappa rather than reporting zero", () => {
    expect(cohenKappa([], [])).toBeNull();
    expect(cohenKappa(["a", "a"], ["a", "a"])).toBeNull();
  });

  it("calculates a Wilson interval for a proportion", () => {
    const [lower, upper] = wilsonInterval(8, 10);
    expect(lower).toBeCloseTo(0.49016, 4);
    expect(upper).toBeCloseTo(0.94332, 4);
    expect(wilsonInterval(0, 0)).toBeNull();
  });

  it("calculates mean absolute error independently for each score", () => {
    expect(
      meanAbsoluteError(
        [
          { correctness: 2, relevance: 1, completeness: 0 },
          { correctness: 1, relevance: 2, completeness: 2 },
        ],
        [
          { correctness: 1, relevance: 1, completeness: 2 },
          { correctness: 1, relevance: 0, completeness: 1 },
        ],
      ),
    ).toEqual({ correctness: 0.5, relevance: 1, completeness: 1.5 });
  });

  it("builds a binary confusion matrix for unsupported claims", () => {
    expect(
      confusionMatrix([false, true, true, false], [false, false, true, true]),
    ).toEqual({
      truePositive: 1,
      trueNegative: 1,
      falsePositive: 1,
      falseNegative: 1,
    });
  });

  it("measures repeatability only when every fresh trial agrees", () => {
    expect(
      repeatabilityRate([
        ["a", "a", "a"],
        ["b", "b", "a"],
        ["tie", "tie", "tie"],
      ]),
    ).toBeCloseTo(2 / 3);
  });

  it("measures identity-preserving changes after a position swap", () => {
    expect(positionChangeRate(["a", "b", "tie", "a"], ["a", "a", "tie", "b"])).toBe(0.5);
  });

  it("counts verbosity outcomes with the expanded response as candidate b", () => {
    expect(verbosityOutcomes(["b", "a", "tie", "b"])).toEqual({
      longerWins: 2,
      shorterWins: 1,
      ties: 1,
      total: 4,
    });
  });
});
