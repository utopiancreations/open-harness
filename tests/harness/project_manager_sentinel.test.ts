import { describe, it, expect } from "vitest";
import { ProjectManagerSentinel } from "../../src/core/harness/project_manager_sentinel.js";

describe("ProjectManagerSentinel", () => {
  it("instantiates cleanly with default model configuration", () => {
    const sentinel = new ProjectManagerSentinel("gemma4:e4b");
    expect(sentinel).toBeDefined();
  });

  it("audits scope drift and returns aligned state fallback gracefully", async () => {
    const sentinel = new ProjectManagerSentinel("gemma4:e4b");
    const result = await sentinel.auditScope(
      "P2P E2EE Mesh Messenger",
      "P2P File Transfer Protocol",
      "create_file",
      "lib/file_sharing/file_chunker.dart"
    );

    expect(result).toHaveProperty("aligned");
    expect(result).toHaveProperty("feedback");
  }, 15000);
});
