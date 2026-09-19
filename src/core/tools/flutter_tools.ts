import { DtdClient } from "../../mobile_bridge/flutter/dtd.js";
import { HeartbeatMonitor, HEARTBEAT_POLICIES } from "../grounding/heartbeat.js";
import { TreeSnapshot } from "../grounding/types.js";

export interface FlutterToolResult {
  ok: boolean;
  summary: string;
  snapshot?: TreeSnapshot;
  diagnostics?: Array<{ severity: string; message: string; file?: string; line?: number }>;
  systemMessages: string[];
  error?: string;
}

export async function flutterHotReloadTool(
  dtd: DtdClient | null,
  heartbeat: HeartbeatMonitor
): Promise<FlutterToolResult> {
  const systemMessages: string[] = [];

  if (!dtd || !dtd.isConnected()) {
    return {
      ok: false,
      summary: "Hot reload skipped: Dart Tooling Daemon (DTD) is not connected.",
      systemMessages: ["[SYSTEM] Flutter DTD connection unavailable. Hot reload requires an active DTD WebSocket."],
    };
  }

  try {
    const reloadStart = Date.now();
    await dtd.hotReload();
    const reloadMs = Date.now() - reloadStart;

    // Settle UI after hot reload using POST_HOT_RELOAD policy
    const settle = await heartbeat.waitForStable(HEARTBEAT_POLICIES.POST_HOT_RELOAD.config);

    if (settle.status === "TIMEOUT") {
      systemMessages.push(
        HEARTBEAT_POLICIES.POST_HOT_RELOAD.injectMessage ||
          "[SYSTEM] UI did not settle after hot reload."
      );
    }

    const snapshot = settle.status === "STABLE" ? settle.snapshot : (settle as any).lastSnapshot;

    return {
      ok: true,
      summary: `Hot reload completed in ${reloadMs}ms. UI state ${settle.status}.`,
      snapshot,
      systemMessages,
    };
  } catch (e: any) {
    return {
      ok: false,
      summary: `Hot reload failed: ${e.message}`,
      systemMessages: [`[SYSTEM] Hot reload error: ${e.message}`],
      error: e.message,
    };
  }
}

export async function flutterHotRestartTool(
  dtd: DtdClient | null,
  heartbeat: HeartbeatMonitor
): Promise<FlutterToolResult> {
  const systemMessages: string[] = [];

  if (!dtd || !dtd.isConnected()) {
    return {
      ok: false,
      summary: "Hot restart skipped: DTD is not connected.",
      systemMessages: ["[SYSTEM] DTD WebSocket unavailable."],
    };
  }

  try {
    const restartStart = Date.now();
    await dtd.hotRestart();
    const restartMs = Date.now() - restartStart;

    // Settle UI after hot restart using POST_LAUNCH policy
    const settle = await heartbeat.waitForStable(HEARTBEAT_POLICIES.POST_LAUNCH.config);

    const snapshot = settle.status === "STABLE" ? settle.snapshot : (settle as any).lastSnapshot;

    return {
      ok: true,
      summary: `Hot restart completed in ${restartMs}ms.`,
      snapshot,
      systemMessages,
    };
  } catch (e: any) {
    return {
      ok: false,
      summary: `Hot restart failed: ${e.message}`,
      systemMessages: [`[SYSTEM] Hot restart error: ${e.message}`],
      error: e.message,
    };
  }
}
