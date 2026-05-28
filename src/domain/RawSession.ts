export interface RawSession {
  provider: string;
  sessionId: string;
  raw: unknown;
  sourcePath?: string;
}
