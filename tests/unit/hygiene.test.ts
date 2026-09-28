import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

describe("project hygiene", () => {
  const sources = listFiles(join(root, "src"));

  it("has no Artsy integration or mentions", () => {
    const pkg = readFileSync(join(root, "package.json"), "utf8");
    const files = [...sources, join(root, ".env.example")].filter((file) =>
      /artsy/i.test(readFileSync(file, "utf8")),
    );
    expect(files).toEqual([]);
    expect(pkg).not.toMatch(/artsy/i);
  });

  it("has no console.log and no explicit any in production code", () => {
    const offenders = sources.filter((file) =>
      /console\.log\(|:\s*any\b|as any\b/.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("never calls Wikipedia from client components", () => {
    const clientFiles = sources.filter((file) =>
      readFileSync(file, "utf8").startsWith('"use client"'),
    );
    const offenders = clientFiles.filter((file) =>
      /wikipedia\.org\/(w\/rest|api\/rest_v1)|lib\/api\/wikipedia/.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
