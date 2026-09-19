import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

export interface EditFileParams {
  filePath: string;
  targetContent: string;
  replacementContent: string;
  projectRoot?: string;
}

export interface EditFileResult {
  ok: boolean;
  summary: string;
  systemMessages: string[];
  error?: string;
}

export function editFileTool(params: EditFileParams): EditFileResult {
  const systemMessages: string[] = [];

  let fullPath = params.filePath;
  if (!isAbsolute(fullPath) && params.projectRoot) {
    fullPath = resolve(params.projectRoot, params.filePath);
  }

  if (!existsSync(fullPath)) {
    return {
      ok: false,
      summary: `File not found: ${params.filePath}`,
      systemMessages: [`[SYSTEM] Cannot edit non-existent file "${params.filePath}".`],
      error: `File not found at ${fullPath}`,
    };
  }

  try {
    const rawOriginal = readFileSync(fullPath, "utf-8");
    const original = rawOriginal.replace(/\r\n/g, "\n");
    const target = params.targetContent.replace(/\r\n/g, "\n");
    const replacement = params.replacementContent.replace(/\r\n/g, "\n");

    if (!original.includes(target)) {
      // Try trimmed match check to provide helpful error
      const trimmedTarget = target.trim();
      const containsTrimmed = original.includes(trimmedTarget);

      return {
        ok: false,
        summary: `Target content not found in ${params.filePath}`,
        systemMessages: [
          `[SYSTEM] Target content block was not found in "${params.filePath}". ${
            containsTrimmed
              ? "Notice: Trimmed content matches! Check leading/trailing whitespace and indentation."
              : "Use 'read_file' to double-check exact lines before invoking 'edit_file'."
          }`,
        ],
        error: `Target content not found`,
      };
    }

    // Replace first occurrence
    const updated = original.replace(target, replacement);
    writeFileSync(fullPath, updated, "utf-8");

    return {
      ok: true,
      summary: `Successfully edited ${params.filePath}`,
      systemMessages,
    };
  } catch (e: any) {
    return {
      ok: false,
      summary: `Failed to edit ${params.filePath}: ${e.message}`,
      systemMessages: [`[SYSTEM] Error editing file: ${e.message}`],
      error: e.message,
    };
  }
}
