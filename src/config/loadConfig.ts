import "dotenv/config";
import { appConfig } from "./appConfig.js";

export interface LoadedConfig {
  outputDir: string;
  openAiApiKey?: string;
}

export function loadConfig(): LoadedConfig {
  const outputDir = process.env[appConfig.outputDirEnvName]?.trim();
  const openAiApiKey = process.env[appConfig.openAiApiKeyEnvName]?.trim();

  if (!outputDir) {
    throw new Error(
      `Missing ${appConfig.outputDirEnvName} in .env. Set the folder where Markdown files should be written.`,
    );
  }

  return {
    outputDir,
    openAiApiKey: openAiApiKey || undefined,
  };
}
