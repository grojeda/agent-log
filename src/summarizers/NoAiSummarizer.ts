import type { ParsedSession } from "../domain/ParsedSession.js";
import type { Summarizer } from "./Summarizer.js";

export class NoAiSummarizer implements Summarizer {
  async summarize(session: ParsedSession): Promise<string> {
    const lines = [
      `# ${session.title ?? `Sesión ${session.provider}`}`,
      "",
      `- Proveedor: ${session.provider}`,
      `- ID de sesión: ${session.sessionId}`,
      `- Exportado el: ${new Date().toISOString()}`,
    ];

    if (session.createdAt) {
      lines.push(`- Fecha de la sesión: ${session.createdAt}`);
    }

    lines.push("", "## Mensajes", "");

    if (session.messages.length === 0) {
      lines.push("_No se encontraron mensajes analizables._");
    } else {
      for (const message of session.messages) {
        lines.push(`### ${message.role}${message.createdAt ? ` - ${message.createdAt}` : ""}`, "");
        lines.push(message.content.trim(), "");
      }
    }

    appendList(lines, "Comandos", session.commands);
    appendList(lines, "Archivos", session.files);
    appendList(lines, "Errores", session.errors);

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
