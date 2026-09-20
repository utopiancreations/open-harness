import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface FlutterAnalyzeResult {
  ok: boolean;
  summary: string;
  systemMessages: string[];
  error?: string;
}

export async function flutterAnalyzeTool(
  projectRoot: string = process.cwd()
): Promise<FlutterAnalyzeResult> {
  try {
    // 1. Validate pubspec.yaml with flutter pub get
    const pubGetRes = await execAsync("flutter pub get", { cwd: projectRoot, timeout: 60000 }).catch(
      (e) => ({ stdout: e.stdout || "", stderr: e.stderr || e.message })
    );

    const combinedPub = (pubGetRes.stdout + "\n" + pubGetRes.stderr).trim();

    if (
      combinedPub.includes("Error on line") ||
      combinedPub.includes("Duplicate mapping key") ||
      combinedPub.includes("pubspec.yaml") ||
      combinedPub.includes("Error:")
    ) {
      const match = combinedPub.match(/Error on line [\s\S]*/);
      const errMsg = match ? match[0].slice(0, 300) : combinedPub.slice(0, 300);
      return {
        ok: false,
        summary: `[PUBSPEC ERROR]: ${errMsg}`,
        error: `[PUBSPEC ERROR]: ${errMsg}`,
        systemMessages: [
          `[SYSTEM ALERT] pubspec.yaml contains duplicate or invalid keys. Read pubspec.yaml and remove duplicate dependency keys.`,
        ],
      };
    }

    // 2. Run flutter analyze
    const analyzeRes = await execAsync("flutter analyze", { cwd: projectRoot, timeout: 60000 }).catch(
      (e) => ({ stdout: e.stdout || "", stderr: e.stderr || e.message })
    );

    const output = (analyzeRes.stdout + "\n" + analyzeRes.stderr).trim();

    if (output.includes("error •") || output.includes("Error on line")) {
      return {
        ok: false,
        summary: output.slice(0, 400),
        error: output.slice(0, 400),
        systemMessages: ["Analyzer detected errors in workspace files."],
      };
    }

    return {
      ok: true,
      summary: output || "Dart analyzer check passed: 0 errors, 0 warnings.",
      systemMessages: [],
    };
  } catch (e: any) {
    return {
      ok: false,
      summary: `Analyzer failed to execute: ${e.message}`,
      error: e.message,
      systemMessages: [],
    };
  }
}
