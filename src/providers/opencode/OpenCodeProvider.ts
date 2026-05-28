import { execa } from "execa";
import type { ParsedSession } from "../../domain/ParsedSession.js";
import type { RawSession } from "../../domain/RawSession.js";
import type { SessionMessage } from "../../domain/SessionMessage.js";
import type { SessionProvider } from "../SessionProvider.js";

export class OpenCodeProvider implements SessionProvider {
  readonly name = "opencode";

  constructor(private readonly sanitizeExport = false) {}

  async exportSession(sessionId: string): Promise<RawSession> {
    try {
      const args = ["export", sessionId];
      if (this.sanitizeExport) {
        args.push("--sanitize");
      }

      const result = await execa("opencode", args, {
        reject: true,
      });

      return {
        provider: this.name,
        sessionId,
        raw: parseJsonOrText(result.stdout),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Could not export OpenCode session "${sessionId}": ${message}`);
    }
  }

  async parseSession(rawSession: RawSession): Promise<ParsedSession> {
    const raw = rawSession.raw;

    if (Array.isArray(raw)) {
      return {
        provider: rawSession.provider,
        sessionId: rawSession.sessionId,
        messages: extractMessages(raw),
      };
    }

    if (typeof raw === "string") {
      return {
        provider: rawSession.provider,
        sessionId: rawSession.sessionId,
        messages: [{ role: "assistant", content: raw }],
      };
    }

    if (!isRecord(raw)) {
      return emptyParsedSession(rawSession);
    }

    return {
      provider: rawSession.provider,
      sessionId: rawSession.sessionId,
      title: readString(raw, ["title", "name", "summary"]),
      createdAt: readString(raw, ["createdAt", "created_at", "time", "timestamp"]),
      messages: extractMessages(raw),
      commands: extractStringList(raw, ["commands", "commandHistory"]),
      files: extractStringList(raw, ["files", "changedFiles"]),
      errors: extractStringList(raw, ["errors"]),
    };
  }
}

function parseJsonOrText(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function emptyParsedSession(rawSession: RawSession): ParsedSession {
  return {
    provider: rawSession.provider,
    sessionId: rawSession.sessionId,
    messages: [],
  };
}

function extractMessages(raw: unknown): SessionMessage[] {
  if (Array.isArray(raw)) {
    return raw.flatMap((item) => {
      const message = normalizeMessage(item);
      return message ? [message] : extractMessages(item);
    });
  }

  if (!isRecord(raw)) {
    return [];
  }

  const candidates = [raw.messages, raw.entries, raw.events, raw.conversation, raw.parts];
  const items = candidates.find(Array.isArray);

  if (!items) {
    return Object.values(raw).flatMap((value) => extractMessages(value));
  }

  return items
    .map((item) => normalizeMessage(item))
    .filter((message): message is SessionMessage => Boolean(message));
}

function normalizeMessage(item: unknown): SessionMessage | undefined {
  if (typeof item === "string") {
    return { role: "assistant", content: item };
  }

  if (!isRecord(item)) {
    return undefined;
  }

  const content = readString(item, ["content", "message", "text", "body"]) ?? readContentParts(item);
  if (!content) {
    return undefined;
  }

  return {
    role: normalizeRole(readString(item, ["role", "type", "author"])),
    content,
    createdAt: readString(item, ["createdAt", "created_at", "time", "timestamp"]),
  };
}

function readContentParts(source: Record<string, unknown>): string | undefined {
  const parts = source.parts;
  if (!Array.isArray(parts)) {
    return undefined;
  }

  const content = parts
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      if (isRecord(part)) {
        return readString(part, ["content", "text", "message"]);
      }

      return undefined;
    })
    .filter((part): part is string => Boolean(part?.trim()))
    .join("\n\n");

  return content || undefined;
}

function normalizeRole(value: string | undefined): SessionMessage["role"] {
  if (value === "user" || value === "assistant" || value === "system" || value === "tool") {
    return value;
  }

  return "assistant";
}

function readString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return undefined;
}

function extractStringList(source: Record<string, unknown>, keys: string[]): string[] | undefined {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) {
      const strings = value.filter((item): item is string => typeof item === "string");
      return strings.length > 0 ? strings : undefined;
    }
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
