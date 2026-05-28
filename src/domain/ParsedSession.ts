import type { SessionMessage } from "./SessionMessage.js";

export interface ParsedSession {
  provider: string;
  sessionId: string;
  title?: string;
  createdAt?: string;
  messages: SessionMessage[];
  commands?: string[];
  files?: string[];
  errors?: string[];
}
