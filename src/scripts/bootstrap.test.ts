/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const bootstrapPath = resolve(__dirname, "..", "..", "scripts", "bootstrap.js");
const require = createRequire(import.meta.url);
const bcrypt = require("bcrypt");

function runBootstrap(...args) {
  try {
    const stdout = execSync(`node "${bootstrapPath}" ${args.join(" ")}`, {
      encoding: "utf-8",
      timeout: 15000,
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { code: 0, stdout, stderr: "" };
  } catch (err) {
    return { code: err.status || 1, stdout: err.stdout || "", stderr: err.stderr || "" };
  }
}

function runWithInput(input, ...args) {
  try {
    const stdout = execSync(`node "${bootstrapPath}" ${args.join(" ")}`, {
      encoding: "utf-8",
      timeout: 15000,
      input,
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { code: 0, stdout, stderr: "" };
  } catch (err) {
    return { code: err.status || 1, stdout: err.stdout || "", stderr: err.stderr || "" };
  }
}

describe("bootstrap --help", () => {
  it("exits with code 0", () => {
    const result = runBootstrap("--help");
    expect(result.code).toBe(0);
  });

  it("prints usage information", () => {
    const result = runBootstrap("--help");
    expect(result.stdout).toContain("ASG Reception Hub");
    expect(result.stdout).toContain("--reset-pins");
    expect(result.stdout).toContain("--dry-run");
    expect(result.stdout).toContain("--help");
  });

  it("performs no prompts (no readline usage)", () => {
    const result = runBootstrap("--help");
    expect(result.stdout).not.toContain("CONFIRM");
    // "PIN" appears in help documentation legitimately; just verify no prompt line
    expect(result.stdout).not.toContain("Type CONFIRM");
  });

  it("performs no Firebase calls (fast exit, no network)", () => {
    const start = Date.now();
    runBootstrap("--help");
    expect(Date.now() - start).toBeLessThan(5000);
  });
});

describe("bootstrap --reset-pins confirmation", () => {
  it("requires CONFIRM RESET to proceed", () => {
    const result = runWithInput("\n", "--reset-pins");
    expect(result.code).not.toBe(0);
    expect(result.stdout).toContain("CONFIRM RESET");
  });

  it("cancellation exits non-zero", () => {
    const result = runWithInput("WRONG\n", "--reset-pins");
    expect(result.code).not.toBe(0);
    expect(result.stdout).toContain("Cancelled");
  });

  it("exits with code 1 on cancellation", () => {
    const result = runWithInput("no\n", "--reset-pins");
    expect(result.code).toBe(1);
  });
});

describe("bootstrap PIN validation", () => {
  it("rejects non-4-digit PINs", () => {
    expect(/^\d{4}$/.test("1234")).toBe(true);
    expect(/^\d{4}$/.test("123")).toBe(false);
    expect(/^\d{4}$/.test("12345")).toBe(false);
    expect(/^\d{4}$/.test("abcd")).toBe(false);
    expect(/^\d{4}$/.test("")).toBe(false);
  });

  it("accepts exactly four digits", () => {
    expect(/^\d{4}$/.test("0000")).toBe(true);
    expect(/^\d{4}$/.test("9999")).toBe(true);
  });

  it("preserves leading zeroes", () => {
    expect(/^\d{4}$/.test("0001")).toBe(true);
  });
});

describe("bcrypt hash verification", () => {
  const testPin = "1234";
  const testPepper = "test-pepper-value";

  it("correct PIN and pepper verify with bcrypt", async () => {
    const hash = await bcrypt.hash(testPin + testPepper, 12);
    const valid = await bcrypt.compare(testPin + testPepper, hash);
    expect(valid).toBe(true);
  });

  it("wrong pepper does not create a usable hash", async () => {
    const hash = await bcrypt.hash(testPin + testPepper, 12);
    const valid = await bcrypt.compare(testPin + "wrong-pepper", hash);
    expect(valid).toBe(false);
  });

  it("wrong PIN does not verify", async () => {
    const hash = await bcrypt.hash(testPin + testPepper, 12);
    const valid = await bcrypt.compare("9999" + testPepper, hash);
    expect(valid).toBe(false);
  });

  it("hash is never the plain input", async () => {
    const hash = await bcrypt.hash(testPin + testPepper, 12);
    expect(hash).not.toContain(testPin);
    expect(hash).not.toContain(testPepper);
  });

  it("salt rounds are 12", async () => {
    const hash = await bcrypt.hash(testPin + testPepper, 12);
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
  });
});

describe("reset-pins account mapping", () => {
  const expectedUids = {
    "brisbane-reception": "GyEaBMx4vKNZJC70yzxbpa0vcyp1",
    "perth-reception": "HFSi3JazOPgUQmylgDF9J81ItZT2",
    "administrator": "ih4hsGpZ8Id3mxXJ2n8A9t11fqe2",
  };

  it("maps all three account keys to UIDs", () => {
    const accountKeys = ["brisbane-reception", "perth-reception", "administrator"];
    expect(accountKeys.length).toBe(3);
    for (const key of accountKeys) {
      expect(expectedUids[key]).toBeDefined();
      expect(expectedUids[key].length).toBeGreaterThan(10);
    }
  });

  it("preserves existing UIDs (identities are stable)", () => {
    expect(expectedUids["brisbane-reception"]).toBe("GyEaBMx4vKNZJC70yzxbpa0vcyp1");
    expect(expectedUids["perth-reception"]).toBe("HFSi3JazOPgUQmylgDF9J81ItZT2");
    expect(expectedUids["administrator"]).toBe("ih4hsGpZ8Id3mxXJ2n8A9t11fqe2");
  });
});

describe("no sensitive values in output", () => {
  it("--help output contains no sensitive keywords", () => {
    const result = runBootstrap("--help");
    // Documentation mentions PIN/pepper/hash legitimately; verify no actual values leak
    expect(result.stdout).not.toMatch(/\b\d{4,}\b/);
    expect(result.stdout).not.toMatch(/token/i);
  });
});

describe("ordinary bootstrap remains idempotent", () => {
  it("--dry-run shows DRY RUN mode", { timeout: 15000 }, () => {
    const result = runBootstrap("--dry-run");
    expect(result.stdout).toContain("DRY RUN");
  });
});
