import { describe, it, expect } from "vitest";
import { TriedSolutionsLogger } from "../../src/core/harness/tried_solutions.js";

describe("TriedSolutionsLogger", () => {
  it("records attempts and provides concise summary", () => {
    const logger = new TriedSolutionsLogger();
    expect(logger.getRecentSummary()).toContain("No prior failed attempts");

    logger.record("edit_file", "lib/main.dart", "Added crypto import", "FAILED", "Target content not found");
    logger.record("edit_file", "pubspec.yaml", "Added cryptography package", "SUCCESS", "File updated cleanly");

    const summary = logger.getRecentSummary();
    expect(summary).toContain("Attempt #1 [FAILED]: edit_file (lib/main.dart)");
    expect(summary).toContain("Attempt #2 [SUCCESS]: edit_file (pubspec.yaml)");
  });

  it("prevents duplicate consecutive recordings", () => {
    const logger = new TriedSolutionsLogger();
    logger.record("read_file", "lib/main.dart", "Inspect file", "FAILED", "File does not exist");
    logger.record("read_file", "lib/main.dart", "Inspect file", "FAILED", "File does not exist");

    const summary = logger.getRecentSummary();
    expect(summary).not.toContain("Attempt #2");
  });

  it("checks if a tool action was previously attempted and failed", () => {
    const logger = new TriedSolutionsLogger();
    logger.record("create_file", "lib/secret.dart", "Create file", "FAILED", "File already exists");

    expect(logger.hasTried("create_file", "lib/secret.dart")).toBe(true);
    expect(logger.hasTried("create_file", "lib/other.dart")).toBe(false);
  });
});
