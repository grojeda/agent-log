import type { ParsedSession } from "../domain/ParsedSession.js";
import type { Summarizer } from "./Summarizer.js";

export class NoAiSummarizer implements Summarizer {
  async summarize(session: ParsedSession): Promise<string> {
    const lines = [
      `# ${session.title ?? `${session.provider} session`}`,
      "",
      `- Provider: ${session.provider}`,
      `- Session ID: ${session.sessionId}`,
      `- Exported at: ${new Date().toISOString()}`,
    ];

    if (session.createdAt) {
      lines.push(`- Session date: ${session.createdAt}`);
    }

    lines.push("", "## Messages", "");

    if (session.messages.length === 0) {
      lines.push("_No parseable messages were found._");
    } else {
      for (const message of session.messages) {
        lines.push(`### ${message.role}${message.createdAt ? ` - ${message.createdAt}` : ""}`, "");
        lines.push(message.content.trim(), "");
      }
    }

    appendList(lines, "Commands", session.commands);
    appendList(lines, "Files", session.files);
    appendList(lines, "Errors", session.errors);

    return `${lines.join("\n").trim()}\n`;
  }
}

function appendList(lines: string[], title: string, values?: string[]): void {
  if (!values || values.length === 0) {
    return;
  }

  lines.push("", `## ${title}`, "");
  for (const value of values) {
    lines.push(`- ${value}`);
  }
}
