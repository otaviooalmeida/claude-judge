import { describe, expect, it } from "vitest";
import { options } from "../../src/cli/run-judging.js";

describe("judging CLI model selection", () => {
  it("runs both configured judge models by default", () => {
    expect(options([]).modelKeys).toEqual(["haiku", "sonnet"]);
  });

  it("allows an individual model run for debugging or staged execution", () => {
    expect(options(["--model", "sonnet"]).modelKeys).toEqual(["sonnet"]);
    expect(options(["--model=haiku"]).modelKeys).toEqual(["haiku"]);
  });
});
