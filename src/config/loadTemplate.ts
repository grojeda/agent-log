import path from "node:path";
import fs from "fs-extra";

export async function loadTemplate(
  templateName: string | undefined,
  templateDir: string | undefined,
): Promise<string | undefined> {
  if (!templateName) {
    return undefined;
  }

  if (!templateDir) {
    console.warn(`Template "${templateName}" requested but TEMPLATE_DIR is not configured. Continuing without additional template instructions.`);
    return undefined;
  }

  const templatePath = path.join(templateDir, `${templateName}.txt`);

  if (!(await fs.pathExists(templatePath))) {
    console.warn(`Template "${templateName}" not found at ${templatePath}. Continuing without additional template instructions.`);
    return undefined;
  }

  try {
    const content = await fs.readFile(templatePath, "utf8");
    return content.trim().length > 0 ? content : undefined;
  } catch (error) {
    console.warn(`Template "${templateName}" could not be read at ${templatePath}. Continuing without additional template instructions. Reason: ${formatError(error)}`);
    return undefined;
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
