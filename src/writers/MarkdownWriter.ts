export interface MarkdownWriter {
  write(markdown: string, options: WriteMarkdownOptions): Promise<string>;
}

export interface WriteMarkdownOptions {
  provider: string;
  sessionId: string;
  createdAt?: string;
  title?: string;
  description?: string;
}
