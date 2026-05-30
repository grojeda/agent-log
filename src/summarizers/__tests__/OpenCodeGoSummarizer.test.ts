import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedSession } from "../../domain/ParsedSession.js";
import { OpenCodeGoSummarizer, buildSummaryPrompt } from "../OpenCodeGoSummarizer.js";

const { createMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
}));

vi.mock("openai", () => ({
  default: vi.fn(function () {
    return {
      chat: {
        completions: {
          create: createMock,
        },
      },
    };
  }),
}));

const session: ParsedSession = {
  provider: "opencode",
  sessionId: "session-12345678",
  title: "AI summary",
  createdAt: "2026-05-30T12:00:00.000Z",
  messages: [
    {
      role: "user",
      content: "Summarize this.",
    },
  ],
};

describe("OpenCodeGoSummarizer", () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it("builds a Spanish-only system prompt", () => {
    expect(buildSummaryPrompt()).toContain("Responde únicamente en español");
  });

  it("appends template instructions after the Spanish delimiter", () => {
    const prompt = buildSummaryPrompt("Usa viñetas y una sección final de riesgos.");

    expect(prompt).toContain("Responde únicamente en español");
    expect(prompt).toContain("Instrucciones de formato adicional:");
    expect(prompt).toMatch(/Instrucciones de formato adicional:\nUsa viñetas y una sección final de riesgos\./u);
  });

  it("sends template-enhanced Spanish prompt to OpenCode Go", async () => {
    createMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: "# Resumen\n",
          },
        },
      ],
    });

    const summarizer = new OpenCodeGoSummarizer("test-api-key", "Usa una tabla de archivos.");

    const markdown = await summarizer.summarize(session);

    expect(markdown).toBe("# Resumen\n");
    expect(createMock).toHaveBeenCalledTimes(1);

    const payload = createMock.mock.calls[0]?.[0] as {
      messages: Array<{ role: string; content: string }>;
    };

    expect(payload.messages[0]?.role).toBe("system");
    expect(payload.messages[0]?.content).toContain("Responde únicamente en español");
    expect(payload.messages[0]?.content).toContain("Instrucciones de formato adicional:");
    expect(payload.messages[0]?.content).toContain("Usa una tabla de archivos.");
  });

  it("falls back to the Spanish NoAiSummarizer when no API key is configured", async () => {
    const summarizer = new OpenCodeGoSummarizer(undefined, "Usa una tabla.");

    const markdown = await summarizer.summarize(session);

    expect(createMock).not.toHaveBeenCalled();
    expect(markdown).toContain("## Mensajes");
    expect(markdown).toContain("- Proveedor: opencode");
  });
});
