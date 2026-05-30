import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../loadConfig.js";

describe("loadConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("loads required output directory and optional template directory", () => {
    vi.stubEnv("OUTPUT_DIR", "C:\\Agent Logs");
    vi.stubEnv("OPENCODE_GO_API_KEY", " test-key ");
    vi.stubEnv("OPENCODE_SANITIZE_EXPORT", "true");
    vi.stubEnv("TEMPLATE_DIR", " C:\\Agent Templates ");

    expect(loadConfig()).toEqual({
      outputDir: "C:\\Agent Logs",
      openCodeGoApiKey: "test-key",
      openCodeSanitizeExport: true,
      templateDir: "C:\\Agent Templates",
    });
  });

  it("does not require TEMPLATE_DIR", () => {
    vi.stubEnv("OUTPUT_DIR", "C:\\Agent Logs");
    vi.stubEnv("TEMPLATE_DIR", "");

    const config = loadConfig();

    expect(config.outputDir).toBe("C:\\Agent Logs");
    expect(config.templateDir).toBeUndefined();
  });

  it("throws when OUTPUT_DIR is missing", () => {
    vi.stubEnv("OUTPUT_DIR", "");

    expect(() => loadConfig()).toThrow(/Missing OUTPUT_DIR/u);
  });
});
