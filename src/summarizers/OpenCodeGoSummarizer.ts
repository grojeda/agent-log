import OpenAI from "openai";
import type { ParsedSession } from "../domain/ParsedSession.js";
import { NoAiSummarizer } from "./NoAiSummarizer.js";
import type { Summarizer } from "./Summarizer.js";

const OPENCODE_GO_BASE_URL = "https://opencode.ai/zen/go/v1";
const OPENCODE_GO_CONFIG_MODEL = "opencode-go/qwen3.6-plus";
const OPENCODE_GO_API_MODEL = "qwen3.6-plus";
const SUMMARY_PROMPT = [
  "Summarize this technical coding-agent session in Markdown for Obsidian storage.",
  "Write the entire summary content in Spanish. Return only Markdown.",
  "Prioritize user messages (`role: user`) as the most important content to identify the goal, requests, and relevant decisions.",
  "Include a `## Objetivo` section; within it, add a `### Mensaje inicial` subsection with the user's first message. If the initial message exceeds 200 words, summarize its content without losing key requirements. If there are no user messages, omit this subsection.",
  "Include these sections when supporting information exists: `## Objetivo`, `## Decisiones clave`, `## Comandos`, `## Archivos modificados`, `## Errores`, `## Próximos pasos`, and `## Resumen general`.",
  "Place the `## Resumen general` section at the end and write exactly 1 concise sentence there (max 25 words) that synthesizes what was accomplished or the final state of the session. Do not use ellipses or visibly truncated text.",
  "Do not invent information. If a section has no supporting data, omit it.",
].join(" ");

const TEMPLATE_DELIMITER = "Instrucciones de formato adicional:";

export function buildSummaryPrompt(templateInstructions?: string): string {
  const normalizedTemplate = templateInstructions?.trim();

  if (!normalizedTemplate) {
    return SUMMARY_PROMPT;
  }

  return [SUMMARY_PROMPT, "", TEMPLATE_DELIMITER, normalizedTemplate].join("\n");
}

export class OpenCodeGoSummarizer implements Summarizer {
  private readonly fallback = new NoAiSummarizer();
  private readonly client?: OpenAI;
  private readonly templateInstructions?: string;

  constructor(apiKey?: string, templateInstructions?: string) {
    this.templateInstructions = templateInstructions?.trim() || undefined;

    if (apiKey) {
      this.client = new OpenAI({
        apiKey,
        baseURL: OPENCODE_GO_BASE_URL,
      });
    }
  }

  async summarize(session: ParsedSession): Promise<string> {
    if (!this.client) {
      return this.fallback.summarize(session);
    }

    try {
      const response = await this.client.chat.completions.create({
        model: OPENCODE_GO_API_MODEL,
        messages: [
          {
            role: "system",
            content: buildSummaryPrompt(this.templateInstructions),
          },
          {
            role: "user",
            content: buildSummaryInput(session),
          },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      });

      const markdown = response.choices[0]?.message.content?.trim();

      if (!markdown) {
        return this.fallback.summarize(session);
      }

      return `${markdown}\n`;
    } catch (error) {
      console.warn(
        `OpenCode Go summarization failed with model "${OPENCODE_GO_CONFIG_MODEL}". Falling back to basic Markdown. Reason: ${formatError(error)}`,
      );

      return this.fallback.summarize(session);
    }
  }
}

function buildSummaryInput(session: ParsedSession): string {
  return [
    "Summarize this parsed coding-agent session.",
    "",
    "Session data:",
    JSON.stringify(session, null, 2),
  ].join("\n");
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
