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

  it("builds an English prompt with Spanish section names", () => {
    const prompt = buildSummaryPrompt();

    expect(prompt).toContain("Write the entire summary content in Spanish");
    expect(prompt).toContain("Prioritize user messages (`role: user`)");
    expect(prompt).toContain("## Objetivo");
    expect(prompt).toContain("### Mensaje inicial");
    expect(prompt).toContain("## Resumen general");
    expect(prompt).toContain("exactly 1 concise sentence");
    expect(prompt).toContain("Do not use ellipses");
    expect(prompt).toContain("Do not invent information");
    expect(prompt).not.toContain("Responde únicamente en español");
    expect(prompt).not.toContain("## Objective");
    expect(prompt).not.toContain("## General summary");
  });

  it("appends template instructions after the delimiter", () => {
    const prompt = buildSummaryPrompt("Use bullet points and a final risks section.");

    expect(prompt).toContain("Write the entire summary content in Spanish");
    expect(prompt).toContain("Instrucciones de formato adicional:");
    expect(prompt).toMatch(/Instrucciones de formato adicional:\nUse bullet points and a final risks section\./u);
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
    expect(payload.messages[0]?.content).toContain("Write the entire summary content in Spanish");
    expect(payload.messages[0]?.content).toContain("Instrucciones de formato adicional:");
    expect(payload.messages[0]?.content).toContain("Usa una tabla de archivos.");
    expect(payload.messages[1]?.role).toBe("user");
    expect(payload.messages[1]?.content).toContain("Summarize this parsed coding-agent session.");
    expect(payload.messages[1]?.content).toContain("Session data:");
    expect(payload.messages[1]?.content).not.toContain("Resume esta sesión parseada");
    expect(payload.messages[1]?.content).not.toContain("Datos de la sesión:");
  });

  it("falls back to the Spanish NoAiSummarizer when no API key is configured", async () => {
    const summarizer = new OpenCodeGoSummarizer(undefined, "Usa una tabla.");

    const markdown = await summarizer.summarize(session);

    expect(createMock).not.toHaveBeenCalled();
    expect(markdown).toContain("## Mensajes");
    expect(markdown).toContain("- Proveedor: opencode");
  });
});
