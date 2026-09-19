import { describe, it, expect, vi } from "vitest";
import { ProjectManagerSentinel } from "../../src/core/harness/project_manager_sentinel.js";

describe("ProjectManagerSentinel", () => {
  it("instantiates cleanly with default model configuration", () => {
    const sentinel = new ProjectManagerSentinel("gemma4:e4b");
    expect(sentinel).toBeDefined();
  });

  it("audits scope drift and returns aligned state fallback gracefully", async () => {
    const sentinel = new ProjectManagerSentinel("gemma4:e4b");

    // Mock LLM response for fast deterministic test execution
    vi.spyOn((sentinel as any).llm, "generateResponse").mockResolvedValue({
      role: "assistant",
      content: JSON.stringify({
        aligned: true,
        reason: "File creation matches P2P milestone scope.",
      }),
    });

    const result = await sentinel.auditScope(
      "P2P E2EE Mesh Messenger",
      "P2P File Transfer Protocol",
      "create_file",
      "lib/file_sharing/file_chunker.dart"
    );

    expect(result.aligned).toBe(true);
    expect(result.feedback).toContain("P2P milestone scope");
  });
});
