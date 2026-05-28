# agent-log

TypeScript CLI for exporting coding agent sessions to Markdown and saving them in Obsidian.

This is a personal project built for my own workflow. It is public so the implementation can be reused or adapted, but the defaults and examples are intentionally shaped around personal note-taking in Obsidian.

The first version supports the `opencode` and `codex` providers, using a simple architecture that makes it easy to add more providers later.

## How It Works

The main command is:

```bash
agent-log export <provider> <sessionId>
```

During the export, the CLI:

1. Loads configuration from `.env`.
2. Looks up the requested provider in `ProviderRegistry`.
3. Exports the session through the provider.
4. Converts the session into the shared `ParsedSession` model.
5. Generates Markdown with `NoAiSummarizer` or `OpenCodeGoSummarizer`.
6. Writes the `.md` file to `OUTPUT_DIR`.

The CLI only orchestrates the flow. Agent-specific logic lives inside each provider.

## Configuration

Create a `.env` file at the project root:

```env
OUTPUT_DIR=C:\Path\To\Your\Obsidian\Vault\Agent Summaries
OPENCODE_GO_API_KEY=
OPENCODE_SANITIZE_EXPORT=false
```

`OUTPUT_DIR` is required and defines where Markdown summaries are saved.

Each environment variable must be on its own line. If `OPENCODE_GO_API_KEY` is accidentally appended to `OUTPUT_DIR`, the app will stop before writing any files.

`OPENCODE_GO_API_KEY` is optional. If it is empty, the tool generates basic Markdown without AI. If it has a value, the tool uses `OpenCodeGoSummarizer` with OpenCode Go and the `opencode-go/qwen3.6-plus` model.

`OPENCODE_SANITIZE_EXPORT` controls OpenCode transcript redaction. It defaults to `false` because this tool is intended for local personal use and summaries need the real transcript content. Set it to `true` if you want OpenCode exports to redact sensitive transcript and file data before summarization.

The `.env` file is ignored by Git. Use `.env.example` as a reference.

## Installation

Install dependencies:

```bash
pnpm install
```

Build the project:

```bash
pnpm build
```

## Development Usage

Export an OpenCode session:

```bash
pnpm dev export opencode ses_1902cc385ffeTkGiLBQcr1ZCnr
```

Export a Codex session:

```bash
pnpm dev export codex <sessionId>
```

OpenCode uses this internal command by default:

```bash
opencode export <sessionId>
```

If `OPENCODE_SANITIZE_EXPORT=true`, it runs:

```bash
opencode export <sessionId> --sanitize
```

In this installation, OpenCode expects IDs in the `ses_...` format.

## Built Usage

After running `pnpm build`:

```bash
pnpm start export opencode <sessionId>
```

You can also link the binary locally if you want to use `agent-log` as a command:

```bash
pnpm link --global
agent-log export opencode <sessionId>
```

## Providers

Providers implement this interface:

```ts
export interface SessionProvider {
  name: string;
  exportSession(sessionId: string): Promise<RawSession>;
  parseSession(rawSession: RawSession): Promise<ParsedSession>;
}
```

This makes it possible to add future providers such as ChatGPT export, Claude Code, Cursor, or others without mixing provider-specific logic into `cli.ts`.

## Markdown Output

The filename includes the date, provider, and the first characters of the `sessionId`:

```txt
2026-05-28 - opencode - ses_1902.md
```

The basic Markdown includes:

- provider
- sessionId
- export date
- parsed messages
- commands, files, and errors when available

When `OPENCODE_GO_API_KEY` is configured, the generated Markdown is an AI summary intended for Obsidian. It asks the model to include the goal, key decisions, commands, files touched, errors, and next steps when those details are present in the parsed session.

## Scripts

```bash
pnpm dev export <provider> <sessionId>
pnpm build
pnpm start export <provider> <sessionId>
```
