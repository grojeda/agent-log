export interface SessionMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt?: string;
}
