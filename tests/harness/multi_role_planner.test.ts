import { describe, it, expect, vi } from "vitest";
import { MultiRolePlanner } from "../../src/core/harness/multi_role_planner.js";
import { join } from "node:path";
import { existsSync, rmSync, readFileSync } from "node:fs";

describe("MultiRolePlanner", () => {
  const testDir = join(__dirname, "temp_planner_test");

  it("should execute multi-role passes (PM, Security, UX, PM Synthesis) and write plan.md", async () => {
    const planner = new MultiRolePlanner({ name: "qwen3.8:latest" });

    // Mock LLM generateResponse
    vi.spyOn(planner["llm"], "generateResponse").mockImplementation(async (messages: any) => {
      const fullContent = messages.map((m: any) => m.content).join("\n");
      if (fullContent.includes("Synthesize all findings")) {
        return { role: "assistant", content: "# Master Plan\n- [ ] Build Flutter E2EE App" };
      }
      if (fullContent.includes("Product Designer")) {
        return { role: "assistant", content: "UX AUDIT: Dark mode + onboarding flow + zero dropoff." };
      }
      if (fullContent.includes("Cybersecurity Manager")) {
        return { role: "assistant", content: "SECURITY AUDIT: AES-256-GCM + ECDH key exchange." };
      }
      return { role: "assistant", content: "PM ARCHITECTURE SPEC: Flutter + Supabase + E2EE." };
    });

    const result = await planner.runMultiRolePlanning(
      "Build E2EE P2P messaging app with Cloudflare & Supabase",
      testDir
    );

    expect(result.pmSpec).toContain("PM ARCHITECTURE SPEC");
    expect(result.securityAudit).toContain("SECURITY AUDIT");
    expect(result.uxAudit).toContain("UX AUDIT");
    expect(result.finalPlan).toContain("# Master Plan");
    expect(existsSync(join(testDir, "plan.md"))).toBe(true);

    // Clean up
    rmSync(testDir, { recursive: true, force: true });
  });
});
