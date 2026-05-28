import path from "node:path";
import fs from "fs-extra";
import { sanitizeFilename } from "../utils/sanitizeFilename.js";
import type { MarkdownWriter, WriteMarkdownOptions } from "./MarkdownWriter.js";

export class FileSessionWriter implements MarkdownWriter {
  constructor(private readonly outputDir: string) {}

  async write(markdown: string, options: WriteMarkdownOptions): Promise<string> {
    await fs.ensureDir(this.outputDir);

    const date = formatDate(options.createdAt ? new Date(options.createdAt) : new Date());
    const shortSessionId = options.sessionId.slice(0, 8);
    const filename = sanitizeFilename(`${date} - ${options.provider} - ${shortSessionId}.md`);
    const outputPath = path.join(this.outputDir, filename);

    await fs.writeFile(outputPath, markdown, "utf8");

    return outputPath;
  }
}

function formatDate(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}
