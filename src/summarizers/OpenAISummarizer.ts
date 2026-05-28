import OpenAI from "openai";
import type { ParsedSession } from "../domain/ParsedSession.js";
import { NoAiSummarizer } from "./NoAiSummarizer.js";
import type { Summarizer } from "./Summarizer.js";

const SUMMARY_PROMPT =
  "Summarize this technical session in Markdown for storage in Obsidian. Include the goal, decisions, commands, touched files, errors, and next steps. Do not invent information.";

export class OpenAISummarizer implements Summarizer {
  private readonly fallback = new NoAiSummarizer();
  private readonly client?: OpenAI;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  async summarize(session: ParsedSession): Promise<string> {
    if (!this.client) {
      return this.fallback.summarize(session);
    }

    try {
      const response = await this.client.responses.create({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: SUMMARY_PROMPT,
          },
          {
            role: "user",
            content: JSON.stringify(session, null, 2),
          },
        ],
      });

      return `${response.output_text.trim()}\n`;
    } catch {
      return this.fallback.summarize(session);
    }
  }
}
