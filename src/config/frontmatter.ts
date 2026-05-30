import path from "node:path";
import fs from "fs-extra";
import type { WriteMarkdownOptions } from "../writers/MarkdownWriter.js";

export const FRONTMATTER_PATH = path.resolve(process.cwd(), "src/config/frontmatter.yaml");

export async function loadFrontmatterBlock(
  options: WriteMarkdownOptions,
  frontmatterPath = FRONTMATTER_PATH,
): Promise<string | undefined> {
  let rawTemplate: string;

  try {
    rawTemplate = await fs.readFile(frontmatterPath, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return undefined;
    }

    throw error;
  }

  return renderFrontmatterBlock(rawTemplate, options);
}

export function renderFrontmatterBlock(
  rawTemplate: string,
  options: WriteMarkdownOptions,
): string | undefined {
  if (rawTemplate.trim().length === 0) {
    return undefined;
  }

  const rendered = replaceFrontmatterPlaceholders(rawTemplate, options).trimEnd();

  if (rendered.trim().length === 0) {
    return undefined;
  }

  return `---\n${rendered}\n---\n`;
}

function replaceFrontmatterPlaceholders(rawTemplate: string, options: WriteMarkdownOptions): string {
  return rawTemplate
    .replaceAll("{{provider}}", options.provider)
    .replaceAll("{{sessionId}}", options.sessionId)
    .replaceAll("{{createdAt}}", options.createdAt ?? "")
    .replaceAll("{{title}}", options.title ?? "")
    .replaceAll("{{description}}", options.description ?? "");
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT";
}
