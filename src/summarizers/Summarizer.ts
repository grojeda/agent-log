import type { ParsedSession } from "../domain/ParsedSession.js";

// This interface keeps the summary strategy separate from the export flow.
export interface Summarizer {
  summarize(session: ParsedSession): Promise<string>;
}
