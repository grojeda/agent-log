import type { ParsedSession } from "../domain/ParsedSession.js";

const DEFAULT_MAX_DESCRIPTION_LENGTH = 150;
const DEFAULT_MAX_TITLE_LENGTH = 80;
const MIN_WORD_BOUNDARY_LENGTH = 40;

export function extractDescriptionFromSummary(
  markdown: string,
  session: ParsedSession,
  maxLength = DEFAULT_MAX_DESCRIPTION_LENGTH,
): string {
  const resumenGeneral = extractResumenGeneral(markdown);
  const source = resumenGeneral || getFirstUserMessage(session);

  return shortenMetadataText(source, maxLength);
}

export function extractTitleFromSummary(
  markdown: string,
  session: ParsedSession,
  maxLength = DEFAULT_MAX_TITLE_LENGTH,
): string {
  const resumenGeneral = extractResumenGeneral(markdown);
  const source = firstNonEmpty([session.title, extractFirstHeading(markdown), resumenGeneral, getFirstUserMessage(session)]);

  return shortenMetadataText(source, maxLength);
}

function extractResumenGeneral(markdown: string): string {
  const match = markdown.match(/^#{2,6}\s+Resumen general\s*\n([\s\S]*?)(?=\n#{1,6}\s+\S|$)/imu);

  if (!match?.[1]) {
    return "";
  }

  return firstSentences(normalizeMarkdownText(match[1]), 1);
}

function getFirstUserMessage(session: ParsedSession): string {
  return session.messages.find((message) => message.role === "user")?.content ?? "";
}

function extractFirstHeading(markdown: string): string {
  const match = markdown.match(/^#\s+(.+?)\s*$/mu);

  return match?.[1] ?? "";
}

function firstNonEmpty(values: Array<string | undefined>): string {
  return values.find((value) => value?.trim())?.trim() ?? "";
}

function normalizeMarkdownText(value: string): string {
  return value
    .replace(/```[\s\S]*?```/gu, " ")
    .replace(/`([^`]+)`/gu, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, "$1")
    .replace(/^\s{0,3}[-*+]\s+/gmu, "")
    .replace(/^\s{0,3}\d+\.\s+/gmu, "")
    .replace(/[*_~>#]/gu, " ");
}

function firstSentences(value: string, maxSentences: number): string {
  const text = sanitizeDescription(value);

  if (!text) {
    return "";
  }

  const sentences = text.match(/[^.!?]+[.!?]+(?=\s|$)/gu);

  if (!sentences || sentences.length === 0) {
    return text;
  }

  return sentences.slice(0, maxSentences).join(" ").trim();
}

function shortenMetadataText(value: string, maxLength: number): string {
  const normalized = sanitizeDescription(normalizeMarkdownText(value));

  if (maxLength <= 0 || normalized.length === 0) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const sentence = firstCompleteSentence(normalized);
  if (sentence && sentence.length <= maxLength) {
    return sentence;
  }

  const candidate = normalized.slice(0, maxLength).trimEnd();
  const lastSpace = candidate.lastIndexOf(" ");

  return (lastSpace >= MIN_WORD_BOUNDARY_LENGTH ? candidate.slice(0, lastSpace) : candidate).trimEnd();
}

function firstCompleteSentence(value: string): string {
  return value.match(/[^.!?]+[.!?]+(?=\s|$)/u)?.[0]?.trim() ?? "";
}

function sanitizeDescription(value: string): string {
  return value.replace(/\r?\n+/gu, " ").replace(/\s+/gu, " ").replace(/"/gu, "'").trim();
}
