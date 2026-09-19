import { LocalLlmClient, ModelConfig } from "../llm/client.js";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export interface MultiRolePlanResult {
  pmSpec: string;
  securityAudit: string;
  uxAudit: string;
  finalPlan: string;
  planFilePath: string;
  requiredBackends: string[];
}

export class MultiRolePlanner {
  private llm: LocalLlmClient;

  constructor(config?: ModelConfig) {
    this.llm = new LocalLlmClient({
      name: config?.name || "qwen3.8:latest",
      endpoint: config?.endpoint || "http://localhost:11434/v1",
      contextWindow: config?.contextWindow || 65536,
    });
  }

  async runMultiRolePlanning(
    goal: string,
    projectRoot: string = process.cwd(),
    onProgress?: (msg: string) => void
  ): Promise<MultiRolePlanResult> {
    // 1. Pass 1: Project Manager (PM) Architecture & Component Scope
    onProgress?.("MULTI-ROLE PLANNER [1/4]: PM Architecture & Stack Breakdown...");
    const pmPrompt = `You are a Senior Technical Project Manager.
The user requested: "${goal}"

Create a concise technical breakdown for this application:
Focus 100% of the architecture and milestone tasks on the user's specific requested feature ("${goal}"). Do NOT drift into boilerplate login screen planning unless specifically requested.
1. Core Architecture & Stack Selection (Flutter/React Native, state management, local storage).
2. Required Infrastructure (P2P sockets, WebRTC, STUN/TURN, mDNS, local mesh).
3. Data Models & State Architecture.
4. Screen Route Hierarchy & Core Flow Map.
5. Step-by-Step Task Breakdown with Checkboxes for Milestones 1 through 5.`;

    let pmSpec = "";
    try {
      const pmResponse = await this.llm.generateResponse([
        { role: "system", content: "You are an elite Senior Technical Project Manager." },
        { role: "user", content: pmPrompt },
      ]);
      pmSpec = pmResponse.content || "PM Plan initialization completed.";
    } catch (e: any) {
      pmSpec = `## PM Architecture Spec\n- Target Goal: ${goal}\n- Stack: Flutter / Dart (Local-First P2P & Mesh Network)\n- Architecture: E2EE Client-to-Client with WebRTC STUN/TURN fallback.`;
    }

    // 2. Pass 2: Cybersecurity Manager Security & Redundancy Audit
    onProgress?.("MULTI-ROLE PLANNER [2/4]: Cybersecurity & Cryptographic Audit...");
    const securityPrompt = `You are a Chief Information Security Officer & Cybersecurity Manager.
Review the following Technical PM Proposal for the goal: "${goal}"

PM Proposal:
${pmSpec}

Perform a security audit:
1. Identify potential security risks, data leak vectors, and unencrypted transport risks.
2. Recommend specific cryptographic protocols (e.g., E2EE AES-256-GCM, ECDH key agreement, P-256/secp256r1 curve, zero-knowledge local storage).
3. Add security redundancies, input sanitization rules, and API token protection.
4. Provide security requirements to integrate into the master plan.`;

    let securityAudit = "";
    try {
      const securityResponse = await this.llm.generateResponse([
        { role: "system", content: "You are a ruthless Cybersecurity Manager & Cryptographic Auditor." },
        { role: "user", content: securityPrompt },
      ]);
      securityAudit = securityResponse.content || "Security audit completed.";
    } catch {
      securityAudit = `## Cybersecurity Controls\n- Encryption: AES-256-GCM E2EE payload protection.\n- Key Exchange: ECDH (P-256 curve).\n- Local Storage: Zero-knowledge encrypted Flutter Secure Storage.`;
    }

    // 3. Pass 3: User Experience (UX) Manager & Retention Audit
    onProgress?.("MULTI-ROLE PLANNER [3/4]: UX Resiliency & Retention Audit...");
    const uxPrompt = `You are a Product Designer & User Experience (UX) Manager.
Review the Technical PM Proposal and Security Audit for: "${goal}"

PM Proposal:
${pmSpec}

Security Audit:
${securityAudit}

Perform a UX and Retention audit:
1. Analyze user onboarding, friction points, and ease of initial setup.
2. Design offline-first UX resiliency, loading states, error recovery prompts, and empty states.
3. Recommend micro-interactions, dark/cyberpunk visual aesthetics, and user retention hooks to prevent drop-off.
4. Provide specific UI/UX requirements to integrate into the master plan.`;

    let uxAudit = "";
    try {
      const uxResponse = await this.llm.generateResponse([
        { role: "system", content: "You are a world-class Product Designer & UX Retention Specialist." },
        { role: "user", content: uxPrompt },
      ]);
      uxAudit = uxResponse.content || "UX audit completed.";
    } catch {
      uxAudit = `## UX & Aesthetic Controls\n- Aesthetic: Sleepy Cyberpunk High-Contrast Dark Theme.\n- Offline UX: Mesh peer discovery fallback indicator & retry actions.`;
    }

    // 4. Pass 4: PM Synthesis & Master Execution Plan
    onProgress?.("MULTI-ROLE PLANNER [4/4]: Master Execution Plan Synthesis...");
    const synthesisPrompt = `You are the Lead Technical Project Manager synthesizing input from Security and UX specialists.

Goal: "${goal}"

PM Initial Proposal:
${pmSpec}

Security Manager Audit:
${securityAudit}

UX Manager Audit:
${uxAudit}

Synthesize all findings into a MASTER SYSTEM SPECIFICATION & EXECUTION PLAN in Markdown format:
# [Project Name] - Master Execution Plan

## 1. System Overview & Architecture
## 2. Security & Encryption Controls (E2EE/Auth/Storage)
## 3. UX Design & User Retention Strategy
## 4. Cloud Backend & Environment Dependencies (.env requirements)
## 5. Structured Execution Checkboxes (- [ ] Task 1...)

Make it actionable, thorough, and highly structured.`;

    let finalPlan = "";
    try {
      const synthesisResponse = await this.llm.generateResponse([
        { role: "system", content: "You are the Lead Systems Architect and Project Manager." },
        { role: "user", content: synthesisPrompt },
      ]);
      finalPlan = synthesisResponse.content || "Master Plan synthesis completed.";
    } catch {
      finalPlan = `# Master Execution Plan - ${goal}\n\n## 1. Architecture\n- Client-to-Client E2EE messaging & local mesh network P2P.\n\n## 2. Security\n- AES-256-GCM payloads & ECDH key exchange.\n\n## 3. Execution Checkboxes\n- [ ] Initialize project structure\n- [ ] Implement E2EE crypto module\n- [ ] Implement P2P mesh discovery\n- [ ] Build chat UI screens`;
    }

    // Detect required backend services
    const requiredBackends: string[] = [];
    const lowerPlan = finalPlan.toLowerCase();
    if (lowerPlan.includes("supabase")) requiredBackends.push("Supabase");
    if (lowerPlan.includes("firebase")) requiredBackends.push("Firebase");
    if (lowerPlan.includes("cloudflare")) requiredBackends.push("Cloudflare Workers");
    if (lowerPlan.includes("neon")) requiredBackends.push("Neon Postgres");
    if (lowerPlan.includes("turn") || lowerPlan.includes("stun") || lowerPlan.includes("webrtc")) {
      requiredBackends.push("WebRTC STUN/TURN");
    }

    // Write master plan to plan.md in project root
    const planFilePath = join(projectRoot, "plan.md");
    try {
      if (!existsSync(projectRoot)) {
        mkdirSync(projectRoot, { recursive: true });
      }
      writeFileSync(planFilePath, finalPlan, "utf-8");
    } catch {
      // Ignore if unwriteable
    }

    return {
      pmSpec,
      securityAudit,
      uxAudit,
      finalPlan,
      planFilePath,
      requiredBackends,
    };
  }
}
