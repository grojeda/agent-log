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
      const metadata = extractSessionMetadata(raw);

      return {
        provider: rawSession.provider,
        sessionId: rawSession.sessionId,
        title: metadata.title,
        createdAt: metadata.createdAt,
        messages: raw.flatMap((item) => normalizeMessages(item)),
        commands: extractCommands(raw),
        files: extractFiles(raw),
        errors: extractErrors(raw),
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
  return normalizeMessages(item)[0];
}

function normalizeMessages(item: unknown): SessionMessage[] {
  if (typeof item === "string") {
    return [{ role: "assistant", content: item }];
  }

  if (!isRecord(item)) {
    return [];
  }

  if (item.type === "response_item" && isRecord(item.payload)) {
    return normalizeResponseItem(item.payload, readString(item, ["timestamp"]));
  }

  if (item.type === "event_msg" && isRecord(item.payload)) {
    return normalizeEventMessage(item.payload, readString(item, ["timestamp"]));
  }

  const content = readString(item, ["content", "message", "text", "body"]);
  if (!content) {
    return [];
  }

  return [
    {
      role: normalizeRole(readString(item, ["role", "type", "author"])) ?? "assistant",
      content,
      createdAt: readString(item, ["createdAt", "created_at", "time", "timestamp"]),
    },
  ];
}

function normalizeResponseItem(payload: Record<string, unknown>, timestamp?: string): SessionMessage[] {
  if (payload.type === "message") {
    const role = normalizeRole(readString(payload, ["role"]));

    if (!role) {
      return [];
    }

    const content = readContent(payload.content);

    return content
      ? [
          {
            role,
            content,
            createdAt: timestamp,
          },
        ]
      : [];
  }

  if (payload.type === "function_call" || payload.type === "custom_tool_call") {
    const name = readString(payload, ["name", "call_id"]) ?? String(payload.type);
    const argumentsText = readString(payload, ["arguments", "input"]);

    return [
      {
        role: "tool",
        content: argumentsText ? `${name}\n${argumentsText}` : name,
        createdAt: timestamp,
      },
    ];
  }

  if (payload.type === "function_call_output" || payload.type === "custom_tool_call_output") {
    const output = readString(payload, ["output"]);

    return output
      ? [
          {
            role: "tool",
            content: output,
            createdAt: timestamp,
          },
        ]
      : [];
  }

  return [];
}

function normalizeEventMessage(payload: Record<string, unknown>, timestamp?: string): SessionMessage[] {
  const userMessage = payload.user_message;
  if (!isRecord(userMessage)) {
    return [];
  }

  const textElements = userMessage.text_elements;
  if (!Array.isArray(textElements)) {
    return [];
  }

  const content = textElements
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join("\n\n");

  return content ? [{ role: "user", content, createdAt: timestamp }] : [];
}

function readContent(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.trim() || undefined;
  }

  if (!Array.isArray(value)) {
    return undefined;
  }

  const content = value
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      if (!isRecord(part)) {
        return undefined;
      }

      return readString(part, ["text", "content"]);
    })
    .filter((part): part is string => Boolean(part?.trim()))
    .join("\n\n");

  return content || undefined;
}

function normalizeRole(value: string | undefined): SessionMessage["role"] | undefined {
  if (value === "user" || value === "assistant" || value === "system" || value === "tool") {
    return value;
  }

  return undefined;
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

function extractSessionMetadata(items: unknown[]): { title?: string; createdAt?: string } {
  for (const item of items) {
    if (!isRecord(item) || item.type !== "session_meta" || !isRecord(item.payload)) {
      continue;
    }

    return {
      title: readString(item.payload, ["id"]),
      createdAt: readString(item.payload, ["timestamp"]),
    };
  }

  return {};
}

function extractCommands(items: unknown[]): string[] | undefined {
  const commands = items
    .flatMap((item) => {
      if (!isRecord(item) || item.type !== "response_item" || !isRecord(item.payload)) {
        return [];
      }

      const payload = item.payload;
      if (payload.type !== "function_call" && payload.type !== "custom_tool_call") {
        return [];
      }

      const name = readString(payload, ["name"]);
      const argumentsText = readString(payload, ["arguments", "input"]);

      if (!name && !argumentsText) {
        return [];
      }

      return [argumentsText ? `${name ?? "tool"} ${argumentsText}` : name ?? "tool"];
    })
    .filter((command) => command.trim().length > 0);

  return commands.length > 0 ? commands : undefined;
}

function extractFiles(items: unknown[]): string[] | undefined {
  const filePattern =
    /(?:[A-Za-z]:)?[\\/][\w .()[\]-]+(?:[\\/][\w .()[\]-]+)+\.[A-Za-z0-9]+|(?:apps|libs|src|test|tests)[\\/][\w .()[\]\/-]+\.[A-Za-z0-9]+/g;
  const files = new Set<string>();

  for (const message of items.flatMap((item) => normalizeMessages(item))) {
    for (const match of message.content.matchAll(filePattern)) {
      files.add(match[0]);
    }
  }

  return files.size > 0 ? [...files] : undefined;
}

function extractErrors(items: unknown[]): string[] | undefined {
  const errors = items
    .flatMap((item) => normalizeMessages(item))
    .filter((message) => /\b(error|failed|exception|fatal)\b/i.test(message.content))
    .map((message) => message.content)
    .slice(0, 20);

  return errors.length > 0 ? errors : undefined;
}
