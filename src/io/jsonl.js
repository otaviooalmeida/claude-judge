import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function readJsonLines(filePath, schema = null) {
  const content = await readFile(filePath, "utf8");
  const records = [];
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;

    let value;
    try {
      value = JSON.parse(line);
      value = schema ? schema.parse(value) : value;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${filePath} line ${index + 1}: ${message}`, { cause: error });
    }
    records.push(value);
  }

  return records;
}

export async function writeJsonLines(filePath, records) {
  await mkdir(dirname(filePath), { recursive: true });
  const content = records.length === 0 ? "" : `${records.map((record) => JSON.stringify(record)).join("\n")}\n`;
  await writeFile(filePath, content, "utf8");
}
