export interface LogcatEntry {
  timestamp: string;
  pid: number;
  tid: number;
  level: "V" | "D" | "I" | "W" | "E" | "F";
  tag: string;
  message: string;
}

export interface FilteredLogcat {
  crashes: LogcatEntry[];
  flutterErrors: LogcatEntry[];
  appWarnings: LogcatEntry[];
  summary: string;
  truncated: boolean;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function parseLogcat(raw: string): LogcatEntry[] {
  const lines = raw.split("\n");
  const entries: LogcatEntry[] = [];
  const logcatRegex = /^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+(\d+)\s+([VDIWEF])\s+([^:]+):\s+(.*)$/;

  for (const line of lines) {
    const match = line.match(logcatRegex);
    if (match) {
      entries.push({
        timestamp: match[1],
        pid: parseInt(match[2], 10),
        tid: parseInt(match[3], 10),
        level: match[4] as any,
        tag: match[5].trim(),
        message: match[6],
      });
    } else if (line.trim().length > 0 && entries.length > 0) {
      entries[entries.length - 1].message += "\n" + line;
    }
  }

  return entries;
}

export function extractCrashBlocks(entries: LogcatEntry[]): LogcatEntry[] {
  const blocks: LogcatEntry[] = [];
  let inCrash = false;
  let crashBuffer: LogcatEntry[] = [];

  for (const e of entries) {
    const isCrashStart = e.message.includes("FATAL EXCEPTION");

    if (isCrashStart) {
      inCrash = true;
      if (crashBuffer.length > 0) {
        blocks.push(mergeCrashBuffer(crashBuffer));
      }
      crashBuffer = [e];
      continue;
    }

    if (inCrash) {
      if (e.pid === crashBuffer[0].pid && e.tag === crashBuffer[0].tag) {
        crashBuffer.push(e);
      } else {
        blocks.push(mergeCrashBuffer(crashBuffer));
        inCrash = false;
        crashBuffer = [];
      }
    }
  }

  if (inCrash && crashBuffer.length > 0) {
    blocks.push(mergeCrashBuffer(crashBuffer));
  }

  return blocks;
}

function mergeCrashBuffer(buffer: LogcatEntry[]): LogcatEntry {
  const first = buffer[0];
  const combinedMessage = buffer.map((b) => b.message).join("\n");
  return {
    ...first,
    message: combinedMessage,
  };
}

export function filterLogcat(
  raw: string,
  pkgName: string,
  budgetTokens: number = 1000
): FilteredLogcat {
  const entries = parseLogcat(raw);
  const crashes = extractCrashBlocks(entries);

  const flutterErrors: LogcatEntry[] = [];
  let inFlutterError = false;
  let flutterBuffer: LogcatEntry[] = [];
  const handledEntries = new Set<LogcatEntry>();

  for (const e of entries) {
    const isCrashPart = crashes.some(c => c.timestamp === e.timestamp && c.pid === e.pid && c.tag === e.tag && c.message.includes(e.message));
    if (isCrashPart) {
      handledEntries.add(e);
    }

    const isFlutterStart =
      e.tag.toLowerCase() === "flutter" &&
      (e.message.includes("FlutterError") ||
        e.message.includes("EXCEPTION CAUGHT BY") ||
        e.message.startsWith("Unhandled exception"));

    if (isFlutterStart) {
      inFlutterError = true;
      if (flutterBuffer.length > 0) {
        flutterErrors.push(mergeCrashBuffer(flutterBuffer));
      }
      flutterBuffer = [e];
      handledEntries.add(e);
      continue;
    }

    if (inFlutterError) {
      if (e.tag.toLowerCase() === "flutter" && e.pid === flutterBuffer[0].pid) {
        flutterBuffer.push(e);
        handledEntries.add(e);
      } else {
        flutterErrors.push(mergeCrashBuffer(flutterBuffer));
        inFlutterError = false;
        flutterBuffer = [];
      }
    }
  }

  if (inFlutterError && flutterBuffer.length > 0) {
    flutterErrors.push(mergeCrashBuffer(flutterBuffer));
  }

  const appWarnings = entries.filter(
    (e) => (e.level === "W" || e.level === "E") && !handledEntries.has(e)
  ).slice(-10);

  const crashSummaryText = crashes.map((c) => c.message).join("\n");
  const flutterSummaryText = flutterErrors.map((f) => f.message).join("\n");

  const summaryParts: string[] = [];
  if (crashes.length > 0) {
    summaryParts.push(`⚠ ${crashes.length} FATAL EXCEPTION:\n${crashSummaryText}`);
  }
  if (flutterErrors.length > 0) {
    summaryParts.push(`⚠ ${flutterErrors.length} Flutter errors:\n${flutterSummaryText}`);
  }
  if (appWarnings.length > 0) {
    summaryParts.push(`⚠ ${appWarnings.length} app warnings (elided)`);
  }

  let summary = summaryParts.length > 0 ? summaryParts.join("\n") : "No errors or crashes in logcat.";
  const truncated = estimateTokens(summary) > budgetTokens;

  if (truncated) {
    const indicator = "\n...[TRUNCATED]";
    const maxChars = Math.max(0, budgetTokens * 4 - indicator.length);
    summary = summary.substring(0, maxChars) + indicator;
  }

  return {
    crashes,
    flutterErrors,
    appWarnings,
    summary,
    truncated,
  };
}
