import path from "node:path";
import os from "node:os";
import fs from "fs-extra";
import { sanitizeFilename } from "../utils/sanitizeFilename.js";
import type { MarkdownWriter, WriteMarkdownOptions } from "./MarkdownWriter.js";
import { FRONTMATTER_PATH, loadFrontmatterBlock } from "../config/frontmatter.js";

export class FileSessionWriter implements MarkdownWriter {
  private readonly outputDir: string;
  private readonly frontmatterPath: string;

  constructor(outputDir: string, frontmatterPath = FRONTMATTER_PATH) {
    this.outputDir = expandHomeDir(outputDir);
    this.frontmatterPath = frontmatterPath;
  }

  async write(markdown: string, options: WriteMarkdownOptions): Promise<string> {
    await fs.ensureDir(this.outputDir);

    const date = formatDate(options.createdAt ? new Date(options.createdAt) : new Date());
    const shortSessionId = options.sessionId.slice(0, 8);
    const titleSegment = options.title ? ` - ${options.title}` : "";
    const filename = sanitizeFilename(`${date} - ${options.provider} - ${shortSessionId}${titleSegment}.md`);
    const outputPath = path.join(this.outputDir, filename);
    const frontmatterBlock = await loadFrontmatterBlock(options, this.frontmatterPath);
    const outputMarkdown = frontmatterBlock ? `${frontmatterBlock}${markdown}` : markdown;

    await fs.writeFile(outputPath, outputMarkdown, "utf8");

    return outputPath;
  }
}

function expandHomeDir(value: string): string {
  if (value === "~") {
    return os.homedir();
  }

  if (value.startsWith("~/") || value.startsWith("~\\")) {
    return path.join(os.homedir(), value.slice(2));
  }

  return value;
}

function formatDate(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}
