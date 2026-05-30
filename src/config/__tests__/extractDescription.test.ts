import { describe, expect, it } from "vitest";
import type { ParsedSession } from "../../domain/ParsedSession.js";
import { extractDescriptionFromSummary, extractTitleFromSummary } from "../extractDescription.js";

const baseSession: ParsedSession = {
  provider: "opencode",
  sessionId: "session-12345678",
  messages: [
    {
      role: "user",
      content: "Necesito generar una bitácora de esta sesión.",
    },
  ],
};

describe("extractDescriptionFromSummary", () => {
  it("extracts one concise sentence from the Resumen general section", () => {
    const markdown = [
      "## Objetivo",
      "Se documentó el objetivo.",
      "",
      "## Resumen general",
      "La sesión definió el diseño de la mejora. También estableció las pruebas necesarias. Esta tercera oración no debe aparecer.",
    ].join("\n");

    expect(extractDescriptionFromSummary(markdown, baseSession)).toBe(
      "La sesión definió el diseño de la mejora.",
    );
  });

  it("falls back to the first user message when Resumen general is missing", () => {
    const session: ParsedSession = {
      ...baseSession,
      messages: [
        {
          role: "system",
          content: "Mensaje interno que no debe usarse.",
        },
        {
          role: "user",
          content:
            "Necesito que actualices el resumen para priorizar los mensajes del usuario y generar una descripción breve para el frontmatter.",
        },
      ],
    };

    expect(extractDescriptionFromSummary("# Resumen\nSin sección final.", session)).toBe(
      "Necesito que actualices el resumen para priorizar los mensajes del usuario y generar una descripción breve para el frontmatter.",
    );
  });

  it("shortens long fallback text without appending an ellipsis", () => {
    const session: ParsedSession = {
      ...baseSession,
      messages: [
        {
          role: "user",
          content:
            "Necesito que generes una descripción muy larga para validar que el extractor recorta correctamente el contenido sin exceder el límite configurado.",
        },
      ],
    };

    const description = extractDescriptionFromSummary("", session, 80);

    expect(description.length).toBeLessThanOrEqual(80);
    expect(description).toMatch(/^Necesito que generes una descripción muy larga/u);
    expect(description).not.toContain("…");
    expect(description).not.toContain("...");
  });

  it("normalizes Markdown and double quotes for frontmatter", () => {
    const markdown = [
      "## Resumen general",
      "- La sesión agregó `description` al \"frontmatter\".",
    ].join("\n");

    expect(extractDescriptionFromSummary(markdown, baseSession)).toBe(
      "La sesión agregó description al 'frontmatter'.",
    );
  });

  it("returns an empty string when no summary or user message is available", () => {
    const session: ParsedSession = {
      provider: "opencode",
      sessionId: "empty-session",
      messages: [],
    };

    expect(extractDescriptionFromSummary("", session)).toBe("");
  });
});

describe("extractTitleFromSummary", () => {
  it("uses the parsed session title when available", () => {
    expect(extractTitleFromSummary("# Título del Markdown", { ...baseSession, title: "Título de sesión" })).toBe(
      "Título de sesión",
    );
  });

  it("falls back to the first user message and keeps it short", () => {
    const session: ParsedSession = {
      ...baseSession,
      messages: [
        {
          role: "user",
          content:
            "Necesito que arregles el frontmatter, mejores el summary y rellenes el título automáticamente en la exportación.",
        },
      ],
    };

    const title = extractTitleFromSummary("## Objetivo\nSin H1", session, 70);

    expect(title).toBe("Necesito que arregles el frontmatter, mejores el summary y rellenes");
    expect(title.length).toBeLessThanOrEqual(70);
  });

  it("falls back to Resumen general when session title and H1 are missing", () => {
    const markdown = [
      "## Objetivo",
      "Sin título definido.",
      "",
      "## Resumen general",
      "Se optimizó la generación de metadatos eliminando campos innecesarios.",
    ].join("\n");

    expect(extractTitleFromSummary(markdown, baseSession)).toBe(
      "Se optimizó la generación de metadatos eliminando campos innecesarios.",
    );
  });
});
