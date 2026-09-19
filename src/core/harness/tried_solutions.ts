export interface TriedAttempt {
  index: number;
  toolName: string;
  target?: string;
  hypothesisOrAction: string;
  outcome: "SUCCESS" | "FAILED" | "NO_CHANGE";
  details: string;
}

export class TriedSolutionsLogger {
  private attempts: TriedAttempt[] = [];

  record(
    toolName: string,
    target: string | undefined,
    hypothesisOrAction: string,
    outcome: "SUCCESS" | "FAILED" | "NO_CHANGE",
    details: string
  ): void {
    // Avoid duplicate recording of exact same target + details
    const last = this.attempts[this.attempts.length - 1];
    if (
      last &&
      last.toolName === toolName &&
      last.target === target &&
      last.details === details
    ) {
      return;
    }

    this.attempts.push({
      index: this.attempts.length + 1,
      toolName,
      target,
      hypothesisOrAction,
      outcome,
      details: details.slice(0, 200), // keep concise for context window efficiency
    });
  }

  getRecentSummary(maxEntries: number = 8): string {
    if (this.attempts.length === 0) return "No prior failed attempts recorded in this milestone.";

    const recent = this.attempts.slice(-maxEntries);
    return recent
      .map(
        (a) =>
          `• Attempt #${a.index} [${a.outcome}]: ${a.toolName}${a.target ? ` (${a.target})` : ""} ➔ ${a.details}`
      )
      .join("\n");
  }

  hasTried(toolName: string, target?: string): boolean {
    return this.attempts.some(
      (a) => a.toolName === toolName && a.target === target && a.outcome === "FAILED"
    );
  }

  clear(): void {
    this.attempts = [];
  }
}
