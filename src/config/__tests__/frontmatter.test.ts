import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { WriteMarkdownOptions } from "../../writers/MarkdownWriter.js";
import { loadFrontmatterBlock, renderFrontmatterBlock } from "../frontmatter.js";

const options: WriteMarkdownOptions = {
  provider: "opencode",
  sessionId: "session-12345678",
  title: "Feature summary",
  description: "A summary of the new feature.",
};

describe("frontmatter", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-log-frontmatter-"));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it("renders placeholders and wraps frontmatter in YAML fences", () => {
    const template = [
      'provider: "{{provider}}"',
      'session_id: "{{sessionId}}"',
      'title: "{{title}}"',
      'description: "{{description}}"',
    ].join("\n");

    expect(renderFrontmatterBlock(template, options)).toBe(
      [
        "---",
        'provider: "opencode"',
        'session_id: "session-12345678"',
        'title: "Feature summary"',
        'description: "A summary of the new feature."',
        "---",
        "",
      ].join("\n"),
    );
  });

  it("uses empty strings for optional missing placeholders", () => {
    const block = renderFrontmatterBlock('title: "{{title}}"\ndescription: "{{description}}"', {
      provider: "codex",
      sessionId: "session-1",
    });

    expect(block).toBe('---\ntitle: ""\ndescription: ""\n---\n');
  });

  it("skips empty frontmatter", () => {
    expect(renderFrontmatterBlock("\n  \n", options)).toBeUndefined();
  });

  it("returns undefined when the frontmatter file is missing", async () => {
    const missingPath = path.join(tempDir, "missing.yaml");

    await expect(loadFrontmatterBlock(options, missingPath)).resolves.toBeUndefined();
  });

  it("loads frontmatter from a file", async () => {
    const frontmatterPath = path.join(tempDir, "frontmatter.yaml");
    await fs.writeFile(frontmatterPath, 'provider: "{{provider}}"', "utf8");

    await expect(loadFrontmatterBlock(options, frontmatterPath)).resolves.toBe('---\nprovider: "opencode"\n---\n');
  });
});
