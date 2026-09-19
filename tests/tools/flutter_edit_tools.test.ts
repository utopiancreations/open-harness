import { describe, it, expect, vi } from "vitest";
import { editFileTool } from "../../src/core/tools/edit_file.js";
import { flutterHotReloadTool, flutterHotRestartTool } from "../../src/core/tools/flutter_tools.js";
import { HeartbeatMonitor } from "../../src/core/grounding/heartbeat.js";
import { writeFileSync, unlinkSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("Phase 3 Tools", () => {
  describe("editFileTool", () => {
    const testFilePath = join(__dirname, "temp_test_file.txt");

    it("should replace target content in file", () => {
      writeFileSync(testFilePath, "const label = 'Login';", "utf-8");

      const result = editFileTool({
        filePath: testFilePath,
        targetContent: "'Login'",
        replacementContent: "'Log In'",
      });

      expect(result.ok).toBe(true);
      expect(result.summary).toContain("Successfully edited");

      const updated = readFileSync(testFilePath, "utf-8");
      expect(updated).toBe("const label = 'Log In';");

      unlinkSync(testFilePath);
    });

    it("should return error if target content is missing", () => {
      writeFileSync(testFilePath, "const label = 'Login';", "utf-8");

      const result = editFileTool({
        filePath: testFilePath,
        targetContent: "'NonExistent'",
        replacementContent: "'Test'",
      });

      expect(result.ok).toBe(false);
      expect(result.summary).toContain("Target content not found");

      unlinkSync(testFilePath);
    });

    it("should return error if file does not exist", () => {
      const result = editFileTool({
        filePath: "/invalid/path/file.txt",
        targetContent: "a",
        replacementContent: "b",
      });

      expect(result.ok).toBe(false);
      expect(result.summary).toContain("File not found");
    });
  });

  describe("flutterHotReloadTool & flutterHotRestartTool", () => {
    const fakeProbe = {
      costMs: 1,
      fast: async () => "hash1",
      slow: async () => ({
        hash: "hash1",
        snapshot: { timestamp: Date.now(), screenScope: "auth", nodes: new Map(), rootSEKs: [], hash: "hash1" },
      }),
    };
    const heartbeat = new HeartbeatMonitor(fakeProbe);

    it("should handle un-connected DTD client gracefully for hot reload", async () => {
      const result = await flutterHotReloadTool(null, heartbeat);
      expect(result.ok).toBe(false);
      expect(result.summary).toContain("DTD");
    });

    it("should handle un-connected DTD client gracefully for hot restart", async () => {
      const result = await flutterHotRestartTool(null, heartbeat);
      expect(result.ok).toBe(false);
      expect(result.summary).toContain("DTD is not connected");
    });

    it("should trigger hot reload and settle heartbeat when connected", async () => {
      const mockDtd = {
        isConnected: () => true,
        hotReload: vi.fn().mockResolvedValue(undefined),
        hotRestart: vi.fn().mockResolvedValue(undefined),
      } as any;

      const result = await flutterHotReloadTool(mockDtd, heartbeat);
      expect(result.ok).toBe(true);
      expect(result.summary).toContain("Hot reload completed");
      expect(mockDtd.hotReload).toHaveBeenCalled();
    });
  });
});
