#!/usr/bin/env node
import { Command } from "commander";
import { loadConfig } from "./config/loadConfig.js";
import { CodexProvider } from "./providers/codex/CodexProvider.js";
import { OpenCodeProvider } from "./providers/opencode/OpenCodeProvider.js";
import { ProviderRegistry } from "./providers/ProviderRegistry.js";
import { NoAiSummarizer } from "./summarizers/NoAiSummarizer.js";
import { OpenCodeGoSummarizer } from "./summarizers/OpenCodeGoSummarizer.js";
import type { Summarizer } from "./summarizers/Summarizer.js";
import { FileSessionWriter } from "./writers/FileSessionWriter.js";

const program = new Command();

program
  .name("agent-log")
  .description("Export coding agent sessions to Markdown for Obsidian.")
  .version("0.1.0");

program
  .command("export")
  .description("Export a session from a supported provider.")
  .argument("<provider>", "Session provider: opencode or codex")
  .argument("<sessionId>", "Session ID to export")
  .action(async (providerName: string, sessionId: string) => {
    try {
      const config = loadConfig();
      const registry = createProviderRegistry(config.openCodeSanitizeExport);
      const provider = registry.get(providerName);
      const summarizer = createSummarizer(config.openCodeGoApiKey);
      const writer = new FileSessionWriter(config.outputDir);

      const rawSession = await provider.exportSession(sessionId);
      const parsedSession = await provider.parseSession(rawSession);
      const markdown = await summarizer.summarize(parsedSession);
      const outputPath = await writer.write(markdown, {
        provider: parsedSession.provider,
        sessionId: parsedSession.sessionId,
        createdAt: parsedSession.createdAt,
      });

      console.log(`Session exported: ${outputPath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exitCode = 1;
    }
  });

program.parseAsync();

function createProviderRegistry(openCodeSanitizeExport: boolean): ProviderRegistry {
  const registry = new ProviderRegistry();

  registry.register(new OpenCodeProvider(openCodeSanitizeExport));
  registry.register(new CodexProvider());

  return registry;
}

function createSummarizer(openCodeGoApiKey?: string): Summarizer {
  if (openCodeGoApiKey) {
    return new OpenCodeGoSummarizer(openCodeGoApiKey);
  }

  return new NoAiSummarizer();
}
