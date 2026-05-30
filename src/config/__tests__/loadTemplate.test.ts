import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadTemplate } from "../loadTemplate.js";

describe("loadTemplate", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-log-template-"));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.remove(tempDir);
  });

  it("returns undefined when no template name is provided", async () => {
    await expect(loadTemplate(undefined, tempDir)).resolves.toBeUndefined();
  });

  it("loads the named .txt template from TEMPLATE_DIR", async () => {
    await fs.writeFile(path.join(tempDir, "daily.txt"), "Use bullet points.", "utf8");

    await expect(loadTemplate("daily", tempDir)).resolves.toBe("Use bullet points.");
  });

  it("warns and continues when TEMPLATE_DIR is not configured", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(loadTemplate("daily", undefined)).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("TEMPLATE_DIR is not configured"));
  });

  it("warns and continues when the template file is missing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(loadTemplate("missing", tempDir)).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining(path.join(tempDir, "missing.txt")));
  });
});
