import "dotenv/config";
import { appConfig } from "./appConfig.js";

export interface LoadedConfig {
  outputDir: string;
  openCodeGoApiKey?: string;
  openCodeSanitizeExport: boolean;
}

export function loadConfig(): LoadedConfig {
  const outputDir = process.env[appConfig.outputDirEnvName]?.trim();
  const openCodeGoApiKey = process.env[appConfig.openCodeGoApiKeyEnvName]?.trim();
  const openCodeSanitizeExport = parseBooleanEnv(process.env[appConfig.openCodeSanitizeExportEnvName]);

  if (!outputDir) {
    throw new Error(
      `Missing ${appConfig.outputDirEnvName} in .env. Set the folder where Markdown files should be written.`,
    );
  }

  validateOutputDir(outputDir);

  return {
    outputDir,
    openCodeGoApiKey: openCodeGoApiKey || undefined,
    openCodeSanitizeExport,
  };
}

function validateOutputDir(outputDir: string): void {
  const containsEnvAssignment = /(?:^|[\s\\/])[A-Z0-9_]+=/u.test(outputDir);
  const containsApiKeyName = /API_KEY=/u.test(outputDir);
  const containsLineBreak = /[\r\n]/u.test(outputDir);

  if (containsEnvAssignment || containsApiKeyName || containsLineBreak) {
    throw new Error(
      [
        `Invalid ${appConfig.outputDirEnvName} in .env.`,
        "It looks like another environment variable was appended to the output path.",
        `Put ${appConfig.outputDirEnvName} and ${appConfig.openCodeGoApiKeyEnvName} on separate lines.`,
      ].join(" "),
    );
  }
}

function parseBooleanEnv(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}
