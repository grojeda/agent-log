import { execa } from "execa";
import { describe, expect, it } from "vitest";

describe("agent-log CLI", () => {
  it("exposes the template flag in help output", async () => {
    const result = await execa("node", ["--import", "tsx", "src/cli.ts", "--help"], {
      reject: false,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("--template <name>");
  }, 30000);
});
