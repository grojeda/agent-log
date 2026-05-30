import { describe, expect, it } from "vitest";
import type { ParsedSession } from "../../domain/ParsedSession.js";
import { NoAiSummarizer } from "../NoAiSummarizer.js";

describe("NoAiSummarizer", () => {
  it("renders static summaries with Spanish labels", async () => {
    const session: ParsedSession = {
      provider: "opencode",
      sessionId: "abcdef1234567890",
      title: "Resumen de prueba",
      createdAt: "2026-05-30T12:00:00.000Z",
      messages: [
        {
          role: "user",
          content: "Implementa la funcionalidad.",
          createdAt: "2026-05-30T12:01:00.000Z",
        },
      ],
      commands: ["pnpm test"],
      files: ["src/cli.ts"],
      errors: ["Example error"],
    };

    const markdown = await new NoAiSummarizer().summarize(session);

    expect(markdown).toContain("# Resumen de prueba");
    expect(markdown).toContain("- Proveedor: opencode");
    expect(markdown).toContain("- ID de sesión: abcdef1234567890");
    expect(markdown).toContain("- Exportado el:");
    expect(markdown).toContain("- Fecha de la sesión: 2026-05-30T12:00:00.000Z");
    expect(markdown).toContain("## Mensajes");
    expect(markdown).toContain("## Comandos");
    expect(markdown).toContain("## Archivos");
    expect(markdown).toContain("## Errores");
    expect(markdown).not.toContain("## Messages");
    expect(markdown).not.toContain("## Commands");
  });

  it("renders the Spanish empty-message text", async () => {
    const session: ParsedSession = {
      provider: "codex",
      sessionId: "empty-session",
      messages: [],
    };

    const markdown = await new NoAiSummarizer().summarize(session);

    expect(markdown).toContain("# Sesión codex");
    expect(markdown).toContain("## Mensajes");
    expect(markdown).toContain("_No se encontraron mensajes analizables._");
    expect(markdown).not.toContain("_No parseable messages were found._");
  });
});
