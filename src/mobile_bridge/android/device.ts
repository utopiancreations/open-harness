import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface DeviceInfo {
  id: string;
  type: "physical" | "emulator";
  model?: string;
  apiLevel?: string;
}

export class DeviceManager {
  private currentDeviceId: string | null = null;

  async discoverDevices(): Promise<DeviceInfo[]> {
    try {
      const { stdout } = await execAsync("adb devices -l");
      const lines = stdout.split("\n").slice(1); // skip header
      const devices: DeviceInfo[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "" || trimmed.startsWith("*")) continue;

        const parts = trimmed.split(/\s+/);
        if (parts.length < 2) continue;

        const id = parts[0];
        const status = parts[1];
        if (status !== "device") continue;

        const type: "physical" | "emulator" = id.startsWith("emulator-") ? "emulator" : "physical";

        // Extract model from `model:<value>` field if present
        let model: string | undefined;
        let apiLevel: string | undefined;
        for (const part of parts.slice(2)) {
          if (part.startsWith("model:")) model = part.split(":")[1];
          if (part.startsWith("transport_id:")) apiLevel = part.split(":")[1];
        }

        devices.push({ id, type, model, apiLevel });
      }

      return devices;
    } catch {
      return [];
    }
  }

  async connect(deviceId?: string): Promise<string> {
    if (deviceId) {
      this.currentDeviceId = deviceId;
      return deviceId;
    }

    const devices = await this.discoverDevices();
    if (devices.length === 0) {
      throw new Error("No Android devices found. Connect a device or start an emulator.");
    }

    // Prefer emulator for dev, physical for ground truth
    const emulator = devices.find((d) => d.type === "emulator");
    const selected = emulator || devices[0];
    this.currentDeviceId = selected.id;
    return selected.id;
  }

  getDeviceId(): string {
    if (!this.currentDeviceId) {
      throw new Error("No device connected. Call connect() first.");
    }
    return this.currentDeviceId;
  }

  get deviceFlag(): string {
    return this.currentDeviceId ? `-s ${this.currentDeviceId}` : "";
  }

  async isAlive(): Promise<boolean> {
    if (!this.currentDeviceId) return false;
    try {
      const { stdout } = await execAsync(`adb ${this.deviceFlag} shell echo ok`, { timeout: 3000 });
      return stdout.trim() === "ok";
    } catch {
      return false;
    }
  }

  async ensureConnection(maxRetries: number = 3): Promise<string> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (await this.isAlive()) {
        return this.currentDeviceId!;
      }

      // Re-scan and reconnect
      this.currentDeviceId = null;
      try {
        await this.connect();
        if (await this.isAlive()) {
          return this.currentDeviceId!;
        }
      } catch {
        // will retry
      }

      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    throw new Error(`Device unreachable after ${maxRetries} reconnect attempts.`);
  }

  async shell(command: string): Promise<string> {
    const { stdout } = await execAsync(
      `adb ${this.deviceFlag} shell ${JSON.stringify(command)}`,
      { timeout: 10000 }
    );
    return stdout;
  }

  async screencap(outputPath: string): Promise<void> {
    await execAsync(`adb ${this.deviceFlag} exec-out screencap -p > ${JSON.stringify(outputPath)}`);
  }
}
