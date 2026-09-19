import { spawn, ChildProcess } from "node:child_process";

export class LogcatStream {
  private process: ChildProcess | null = null;
  private buffer: string[] = [];
  private maxLines: number;
  private deviceId?: string;

  constructor(deviceId?: string, maxLines: number = 500) {
    this.deviceId = deviceId;
    this.maxLines = maxLines;
  }

  start(packageFilter?: string): void {
    if (this.process) {
      this.stop();
    }

    const args: string[] = [];
    if (this.deviceId) {
      args.push("-s", this.deviceId);
    }
    args.push("logcat", "-v", "time");

    this.process = spawn("adb", args, { stdio: ["ignore", "pipe", "pipe"] });

    let partial = "";

    this.process.stdout?.on("data", (chunk: Buffer) => {
      const text = partial + chunk.toString();
      const lines = text.split("\n");
      partial = lines.pop() || ""; // save incomplete line

      for (const line of lines) {
        if (line.trim().length === 0) continue;

        // If package filter is set, only keep matching lines
        if (packageFilter && !line.includes(packageFilter)) continue;

        this.buffer.push(line);

        // Circular buffer: drop oldest when exceeding max
        while (this.buffer.length > this.maxLines) {
          this.buffer.shift();
        }
      }
    });

    this.process.on("error", () => {
      this.process = null;
    });

    this.process.on("exit", () => {
      this.process = null;
    });
  }

  stop(): void {
    if (this.process) {
      this.process.kill("SIGTERM");
      this.process = null;
    }
  }

  getBuffer(clear: boolean = false): string {
    const output = this.buffer.join("\n");
    if (clear) {
      this.buffer = [];
    }
    return output;
  }

  getRecentLines(count: number = 50): string {
    return this.buffer.slice(-count).join("\n");
  }

  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }
}
