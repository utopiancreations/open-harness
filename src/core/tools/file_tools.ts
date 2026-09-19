import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { isAbsolute, resolve, join, relative } from "node:path";

export interface ListFilesParams {
  dirPath?: string;
  projectRoot?: string;
  recursive?: boolean;
}

export interface ListFilesResult {
  ok: boolean;
  files: string[];
  summary: string;
  systemMessages: string[];
  error?: string;
}

export function listFilesTool(params: ListFilesParams): ListFilesResult {
  const root = params.projectRoot || process.cwd();
  const targetDir = params.dirPath
    ? (isAbsolute(params.dirPath) ? params.dirPath : resolve(root, params.dirPath))
    : root;

  if (!existsSync(targetDir)) {
    return {
      ok: false,
      files: [],
      summary: `Directory not found: ${params.dirPath || "."}`,
      systemMessages: [`[SYSTEM] Directory "${params.dirPath || "."}" does not exist.`],
      error: `Directory not found at ${targetDir}`,
    };
  }

  const results: string[] = [];
  const maxFiles = 200;

  function walk(currentDir: string) {
    if (results.length >= maxFiles) return;
    try {
      const entries = readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (results.length >= maxFiles) break;
        if (
          entry.name.startsWith(".") ||
          entry.name === "node_modules" ||
          entry.name === "build" ||
          entry.name === "dist" ||
          entry.name === "artifacts" ||
          entry.name === ".dart_tool"
        ) {
          continue;
        }

        const fullPath = join(currentDir, entry.name);
        const relPath = relative(root, fullPath);

        if (entry.isDirectory()) {
          if (params.recursive !== false) {
            walk(fullPath);
          }
        } else if (entry.isFile()) {
          if (entry.name.endsWith(".map") || entry.name.endsWith(".d.ts")) {
            continue;
          }
          results.push(relPath);
        }
      }
    } catch {
      // ignore unreadable dirs
    }
  }

  walk(targetDir);

  return {
    ok: true,
    files: results,
    summary: `Found ${results.length} files in ${params.dirPath || "workspace root"}:\n${results.join("\n")}`,
    systemMessages: [],
  };
}

export interface ReadFileParams {
  filePath: string;
  projectRoot?: string;
}

export interface ReadFileResult {
  ok: boolean;
  content?: string;
  summary: string;
  systemMessages: string[];
  error?: string;
}

export function readFileTool(params: ReadFileParams): ReadFileResult {
  const root = params.projectRoot || process.cwd();
  const fullPath = isAbsolute(params.filePath)
    ? params.filePath
    : resolve(root, params.filePath);

  if (!existsSync(fullPath)) {
    return {
      ok: false,
      summary: `File not found: ${params.filePath}`,
      systemMessages: [
        `[SYSTEM] File "${params.filePath}" does not exist. Use list_files to see existing files or create_file to make a new one.`,
      ],
      error: `File not found at ${fullPath}`,
    };
  }

  try {
    const content = readFileSync(fullPath, "utf-8");
    return {
      ok: true,
      content,
      summary: `File "${params.filePath}" (${content.split("\n").length} lines):\n\`\`\`\n${content}\n\`\`\``,
      systemMessages: [],
    };
  } catch (e: any) {
    return {
      ok: false,
      summary: `Failed to read ${params.filePath}: ${e.message}`,
      systemMessages: [`[SYSTEM] Read error: ${e.message}`],
      error: e.message,
    };
  }
}

export interface CreateFileParams {
  filePath: string;
  content: string;
  overwrite?: boolean;
  projectRoot?: string;
}

export interface CreateFileResult {
  ok: boolean;
  summary: string;
  systemMessages: string[];
  error?: string;
}

export function createFileTool(params: CreateFileParams): CreateFileResult {
  const root = params.projectRoot || process.cwd();
  const fullPath = isAbsolute(params.filePath)
    ? params.filePath
    : resolve(root, params.filePath);

  if (existsSync(fullPath) && !params.overwrite) {
    return {
      ok: false,
      summary: `File already exists at "${params.filePath}". Use 'edit_file' to modify existing code, or set 'overwrite: true' to replace the file.`,
      systemMessages: [
        `[SYSTEM] SAFETY PRECAUTION: "${params.filePath}" already exists. create_file is rejected to prevent wiping existing code. Use 'edit_file' for targeted edits, or pass 'overwrite: true' if you intend to replace the file.`,
      ],
      error: `File already exists at ${fullPath}. Use edit_file instead.`,
    };
  }

  try {
    const parentDir = resolve(fullPath, "..");
    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true });
    }

    writeFileSync(fullPath, params.content, "utf-8");
    return {
      ok: true,
      summary: `Successfully created file "${params.filePath}".`,
      systemMessages: [],
    };
  } catch (e: any) {
    return {
      ok: false,
      summary: `Failed to create file "${params.filePath}": ${e.message}`,
      systemMessages: [`[SYSTEM] Create file error: ${e.message}`],
      error: e.message,
    };
  }
}
