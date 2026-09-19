import { HeartbeatProbe } from "./types.js";
import { TreeSnapshot } from "../types.js";

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export class AndroidWindowProbe implements HeartbeatProbe {
  costMs = 80;

  constructor(
    private adbShell: (cmd: string) => Promise<string>,
    private getFullSnapshot: () => Promise<TreeSnapshot>
  ) {}

  async fast(): Promise<string | null> {
    try {
      const out = await this.adbShell(
        "dumpsys window windows | grep -E 'mCurrentFocus|mFocusedApp'"
      );
      return simpleHash(out);
    } catch {
      return null;
    }
  }

  async slow(): Promise<{ hash: string; snapshot: TreeSnapshot }> {
    const snapshot = await this.getFullSnapshot();
    return { hash: snapshot.hash, snapshot };
  }
}
