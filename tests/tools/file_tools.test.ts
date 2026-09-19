import { describe, it, expect, beforeAll } from "vitest";
import { listFilesTool, readFileTool, createFileTool } from "../../src/core/tools/file_tools.js";
import { editFileTool } from "../../src/core/tools/edit_file.js";
import { join } from "node:path";
import { unlinkSync, existsSync, rmSync, mkdirSync, writeFileSync } from "node:fs";

describe("Workspace File Tools", () => {
  const testDir = join(__dirname, "temp_file_tools_test");
  const testFilePath = join(testDir, "sample.txt");

  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should create a file and directory recursively", () => {
    const result = createFileTool({
      filePath: testFilePath,
      content: "Hello, Open Harness!",
    });

    expect(result.ok).toBe(true);
    expect(existsSync(testFilePath)).toBe(true);
  });

  it("should REJECT create_file on existing file without overwrite flag", () => {
    const result = createFileTool({
      filePath: testFilePath,
      content: "Overwriting without permission!",
    });

    expect(result.ok).toBe(false);
    expect(result.summary).toContain("File already exists");
    expect(result.error).toContain("Use edit_file instead");
  });

  it("should ALLOW create_file on existing file with overwrite: true", () => {
    const result = createFileTool({
      filePath: testFilePath,
      content: "Explicit overwrite approved.",
      overwrite: true,
    });

    expect(result.ok).toBe(true);
    const readRes = readFileTool({ filePath: testFilePath });
    expect(readRes.content).toBe("Explicit overwrite approved.");
  });

  it("should edit existing file cleanly using edit_file", () => {
    const result = editFileTool({
      filePath: testFilePath,
      targetContent: "Explicit overwrite approved.",
      replacementContent: "Surgically modified via edit_file.",
    });

    expect(result.ok).toBe(true);
    const readRes = readFileTool({ filePath: testFilePath });
    expect(readRes.content).toBe("Surgically modified via edit_file.");
  });

  it("should handle CRLF and LF line endings gracefully in edit_file", () => {
    const crlfFile = join(testDir, "crlf.txt");
    writeFileSync(crlfFile, "line1\r\nline2\r\nline3\r\n", "utf-8");

    const result = editFileTool({
      filePath: crlfFile,
      targetContent: "line2",
      replacementContent: "line2_modified",
    });

    expect(result.ok).toBe(true);
    const readRes = readFileTool({ filePath: crlfFile });
    expect(readRes.content).toContain("line2_modified");
  });

  it("should read created file contents", () => {
    const result = readFileTool({
      filePath: testFilePath,
    });

    expect(result.ok).toBe(true);
    expect(result.content).toBe("Surgically modified via edit_file.");
  });

  it("should list files in directory", () => {
    const result = listFilesTool({
      dirPath: testDir,
    });

    expect(result.ok).toBe(true);
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.files.some((f) => f.includes("sample.txt"))).toBe(true);

    // Clean up
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should handle reading non-existent file gracefully", () => {
    const result = readFileTool({
      filePath: "/non/existent/file.txt",
    });

    expect(result.ok).toBe(false);
    expect(result.summary).toContain("File not found");
  });
});
