import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface AdbDevice {
  id: string;
  type: "device" | "emulator" | "unauthorized";
}

export class AdbClient {
  constructor(private targetDeviceId?: string) {}

  private get deviceFlag(): string {
    return this.targetDeviceId ? `-s ${this.targetDeviceId}` : "";
  }

  async listDevices(): Promise<AdbDevice[]> {
    try {
      const { stdout } = await execAsync("adb devices");
      const lines = stdout.split("\n").slice(1);
      const devices: AdbDevice[] = [];

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          const id = parts[0];
          const status = parts[1];
          const type = id.startsWith("emulator-") ? "emulator" : "device";
          if (status === "device") {
            devices.push({ id, type });
          }
        }
      }

      return devices;
    } catch (e) {
      return [];
    }
  }

  async shell(command: string): Promise<string> {
    const fullCmd = `adb ${this.deviceFlag} shell "${command.replace(/"/g, '\\"')}"`;
    const { stdout } = await execAsync(fullCmd);
    return stdout;
  }

  async tap(x: number, y: number): Promise<void> {
    await this.shell(`input tap ${x} ${y}`);
  }

  async type(text: string): Promise<void> {
    const escaped = text.replace(/\s/g, "%s");
    await this.shell(`input text "${escaped}"`);
  }

  async dumpUiXml(): Promise<string> {
    const remotePath = "/sdcard/open_harness_dump.xml";
    await this.shell(`uiautomator dump ${remotePath}`);
    const { stdout } = await execAsync(`adb ${this.deviceFlag} shell "cat ${remotePath}"`);
    return stdout;
  }

  async getLogcat(lines: number = 200): Promise<string> {
    const { stdout } = await execAsync(`adb ${this.deviceFlag} logcat -d -n ${lines}`);
    return stdout;
  }
}
