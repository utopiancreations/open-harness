import { DiffOutcome } from "./types.js";

export interface ActionRecordHistory {
  sek: string;
  action: string;
  outcome: DiffOutcome;
}

export type LoopSignalType = "DEAD_ELEMENT_STUCK" | "NAVIGATION_CYCLE";

export interface LoopSignal {
  type: LoopSignalType;
  sek: string;
  message: string;
}

export class ActionHistory {
  private history: ActionRecordHistory[] = [];

  record(sek: string, action: string, outcome: DiffOutcome): void {
    this.history.push({ sek, action, outcome });
    if (this.history.length > 20) {
      this.history.shift();
    }
  }

  detectLoop(): LoopSignal | null {
    if (this.history.length < 3) return null;

    const last3 = this.history.slice(-3);
    const firstTarget = last3[0].sek;

    // 1. 3 consecutive NO_CHANGE on the same target
    const isDeadTap = last3.every((r) => r.sek === firstTarget && r.outcome === "NO_CHANGE");
    if (isDeadTap) {
      return {
        type: "DEAD_ELEMENT_STUCK",
        sek: firstTarget,
        message: `[SYSTEM] Loop detected: You have targeted "${firstTarget}" 3 times with NO_CHANGE. The element may be disabled, off-screen, or require a preceding step. Try logcat_tail, ui_dump(full=true), or inspect visually.`,
      };
    }

    // 2. 4-step Navigation Cycle (A -> B -> A -> B)
    if (this.history.length >= 4) {
      const last4 = this.history.slice(-4);
      if (
        last4[0].sek === last4[2].sek &&
        last4[1].sek === last4[3].sek &&
        last4[0].sek !== last4[1].sek
      ) {
        return {
          type: "NAVIGATION_CYCLE",
          sek: last4[3].sek,
          message: `[SYSTEM] Navigation cycle detected between "${last4[0].sek}" and "${last4[1].sek}". Break the loop by trying a different action or checking logs.`,
        };
      }
    }

    return null;
  }
}
