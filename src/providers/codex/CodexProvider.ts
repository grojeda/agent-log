import path from "node:path";
import fs from "fs-extra";
import type { ParsedSession } from "../../domain/ParsedSession.js";
import type { RawSession } from "../../domain/RawSession.js";
import type { SessionMessage } from "../../domain/SessionMessage.js";
import type { SessionProvider } from "../SessionProvider.js";

export class CodexProvider implements SessionProvider {
  readonly name = "codex";

  async exportSession(sessionId: string): Promise<RawSession> {
    const codexHome = process.env.CODEX_HOME || path.join(process.env.USERPROFILE ?? "", ".codex");

    if (!codexHome || !(await fs.pathExists(codexHome))) {
      throw new Error(`CODEX_HOME or the default Codex directory was not found: ${codexHome}`);
    }

    const sourcePath = await findSessionFile(codexHome, sessionId);
    if (!sourcePath) {
      throw new Error(`Codex session "${sessionId}" was not found in ${codexHome}`);
    }

    const content = await fs.readFile(sourcePath, "utf8");

    return {
      provider: this.name,
      sessionId,
      raw: parseJsonJsonlOrText(content),
      sourcePath,
    };
  }

  async parseSession(rawSession: RawSession): Promise<ParsedSession> {
    const raw = rawSession.raw;

    if (Array.isArray(raw)) {
      return {
        provider: rawSession.provider,
        sessionId: rawSession.sessionId,
        messages: raw
          .map((item) => normalizeMessage(item))
          .filter((message): message is SessionMessage => Boolean(message)),
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
      return {
        provider: rawSession.provider,
        sessionId: rawSession.sessionId,
        messages: [],
      };
    }

    const messages = Array.isArray(raw.messages)
      ? raw.messages
          .map((item) => normalizeMessage(item))
          .filter((message): message is SessionMessage => Boolean(message))
      : [];

    return {
      provider: rawSession.provider,
      sessionId: rawSession.sessionId,
      title: readString(raw, ["title", "name"]),
      createdAt: readString(raw, ["createdAt", "created_at", "timestamp"]),
      messages,
      commands: extractStringList(raw, ["commands"]),
      files: extractStringList(raw, ["files"]),
      errors: extractStringList(raw, ["errors"]),
    };
  }
}

async function findSessionFile(rootDir: string, sessionId: string): Promise<string | undefined> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      const nestedMatch = await findSessionFile(fullPath, sessionId);
      if (nestedMatch) {
        return nestedMatch;
      }
      continue;
    }

    if (entry.isFile() && entry.name.includes(sessionId)) {
      return fullPath;
    }
  }

  return undefined;
}

function parseJsonJsonlOrText(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const parsedLines = lines.map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return undefined;
      }
    });

    if (parsedLines.every((line) => line !== undefined)) {
      return parsedLines;
    }

    return content;
  }
}

function normalizeMessage(item: unknown): SessionMessage | undefined {
  if (typeof item === "string") {
    return { role: "assistant", content: item };
  }

  if (!isRecord(item)) {
    return undefined;
  }

  const content = readString(item, ["content", "message", "text", "body"]);
  if (!content) {
    return undefined;
  }

  return {
    role: normalizeRole(readString(item, ["role", "type", "author"])),
    content,
    createdAt: readString(item, ["createdAt", "created_at", "time", "timestamp"]),
  };
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
