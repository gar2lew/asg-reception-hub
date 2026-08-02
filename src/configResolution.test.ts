// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import viteConfig from "../vite.config";
import vitestConfig from "../vitest.config";

const standardExtensions = [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"];

function resolverExtensions(config: unknown) {
  return (config as { resolve?: { extensions?: string[] } }).resolve?.extensions;
}

describe("source resolution configuration", () => {
  it.each([
    ["Vite", viteConfig],
    ["Vitest", vitestConfig],
  ])("keeps standard extensions and resolves TypeScript before JavaScript in %s", (_, config) => {
    const extensions = resolverExtensions(config);

    expect(extensions).toBeDefined();
    expect([...extensions!].sort()).toEqual([...standardExtensions].sort());
    expect(extensions!.indexOf(".ts")).toBeLessThan(extensions!.indexOf(".js"));
    expect(extensions!.indexOf(".tsx")).toBeLessThan(extensions!.indexOf(".jsx"));
  });

  it("rewrites every Vercel route to the SPA entrypoint", () => {
    const vercelConfigPath = join(process.cwd(), "vercel.json");

    expect(existsSync(vercelConfigPath)).toBe(true);
    const config = JSON.parse(readFileSync(vercelConfigPath, "utf8"));

    expect(config.rewrites).toEqual([
      { source: "/(.*)", destination: "/index.html" },
    ]);
  });

  it("does not ignore the Vitest configuration used by the root test script", () => {
    const gitIgnorePath = join(process.cwd(), ".gitignore");
    const ignoreRules = readFileSync(gitIgnorePath, "utf8").split(/\r?\n/);

    expect(ignoreRules).not.toContain("vitest.config.ts");
  });
});
