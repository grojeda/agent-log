import type { ParsedSession } from "../domain/ParsedSession.js";
import type { RawSession } from "../domain/RawSession.js";

// This interface lets new providers be added without changing the CLI.
export interface SessionProvider {
  name: string;

  exportSession(sessionId: string): Promise<RawSession>;

  parseSession(rawSession: RawSession): Promise<ParsedSession>;
}
