import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readJsonLines, writeJsonLines } from "../../src/io/jsonl.js";

const schema = {
  parse(value) {
    if (typeof value.id !== "string") throw new Error("id must be a string");
    return value;
  },
};

describe("JSONL storage", () => {
  it("writes and reads validated records without changing order", async () => {
    const directory = await mkdtemp(join(tmpdir(), "claude-judge-"));
    const path = join(directory, "records.jsonl");
    const records = [{ id: "one" }, { id: "two", value: 2 }];

    await writeJsonLines(path, records);

    expect(await readJsonLines(path, schema)).toEqual(records);
    expect((await readFile(path, "utf8")).endsWith("\n")).toBe(true);
  });

  it("includes the line number when a record fails validation", async () => {
    const directory = await mkdtemp(join(tmpdir(), "claude-judge-"));
    const path = join(directory, "records.jsonl");
    await writeJsonLines(path, [{ id: "one" }, { value: 2 }]);

    await expect(readJsonLines(path, schema)).rejects.toThrow(/line 2/i);
  });
});
