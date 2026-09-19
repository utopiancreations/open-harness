import { describe, it, expect } from "vitest";
import { EnvManager } from "../../src/core/harness/env_manager.js";
import { join } from "node:path";
import { existsSync, rmSync, readFileSync } from "node:fs";

describe("EnvManager", () => {
  const testDir = join(__dirname, "temp_env_test");

  it("should generate .env.example and .env files for detected backends", () => {
    const requiredBackends = ["Cloudflare Workers", "Supabase", "WebRTC STUN/TURN"];

    const result = EnvManager.generateEnvTemplates(testDir, requiredBackends);

    expect(result.keysAdded).toContain("CLOUDFLARE_WORKER_URL");
    expect(result.keysAdded).toContain("SUPABASE_URL");
    expect(result.keysAdded).toContain("STUN_SERVER_URL");

    expect(existsSync(join(testDir, ".env.example"))).toBe(true);
    expect(existsSync(join(testDir, ".env"))).toBe(true);

    const exampleContent = readFileSync(join(testDir, ".env.example"), "utf-8");
    expect(exampleContent).toContain("CLOUDFLARE_WORKER_URL");
    expect(exampleContent).toContain("SUPABASE_ANON_KEY");

    // Clean up
    rmSync(testDir, { recursive: true, force: true });
  });
});
