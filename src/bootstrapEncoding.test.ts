import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const bootstrapPath = join(process.cwd(), "scripts", "bootstrap.js");

describe("bootstrap hidden PowerShell prompt", () => {
  it("writes sensitive prompt output as UTF-8 without a byte-order mark", () => {
    const source = readFileSync(bootstrapPath, "utf8");

    expect(source).toContain("[System.Text.UTF8Encoding]::new($false)");
    expect(source).not.toContain("[System.Text.Encoding]::UTF8)");
  });
});
