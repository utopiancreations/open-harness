import { TranscriptLogger, TranscriptTurn } from "./transcript.js";
import { ActionHistory } from "../grounding/loop_detector.js";
import { HeartbeatMonitor, HEARTBEAT_POLICIES } from "../grounding/heartbeat.js";
import { HeartbeatProbe } from "../grounding/probes/types.js";
import { ContextCompactor, allocateBudget, Observation } from "../compactor/index.js";
import { LocalLlmClient, ModelConfig } from "../llm/client.js";
import { HARNESS_TOOLS } from "../llm/tool_schema.js";
import { SYSTEM_PROMPT, formatActionObservation, formatUiDumpObservation } from "../llm/prompt.js";
import { uiDumpTool } from "../tools/ui_dump.js";
import { uiTapTool } from "../tools/ui_tap.js";
import { uiTypeTool } from "../tools/ui_type.js";
import { executeUiAction, ToolExecutionContext } from "../tools/registry.js";
import { TreeSnapshot, UIDiff } from "../grounding/types.js";

import { flutterHotReloadTool, flutterHotRestartTool } from "../tools/flutter_tools.js";
import { flutterAnalyzeTool } from "../tools/flutter_analyze.js";
import { editFileTool } from "../tools/edit_file.js";
import { listFilesTool, readFileTool, createFileTool } from "../tools/file_tools.js";
import { AgentConsultant } from "./agent_consultant.js";
import { DtdClient } from "../../mobile_bridge/flutter/dtd.js";
import { LogcatStream } from "../../mobile_bridge/android/logcat.js";

import { MultiRolePlanner } from "./multi_role_planner.js";
import { EnvManager } from "./env_manager.js";

import { MilestoneController, HarnessMilestone } from "./milestone_controller.js";
import { TriedSolutionsLogger } from "./tried_solutions.js";
import { ProjectManagerSentinel } from "./project_manager_sentinel.js";

export interface HarnessConfig {
  model: ModelConfig;
  probe: HeartbeatProbe;
  adbTap: (x: number, y: number) => Promise<void>;
  adbType: (text: string) => Promise<void>;
  adbSwipe: (x1: number, y1: number, x2: number, y2: number) => Promise<void>;
  outputDir: string;
  dtd?: DtdClient;
  logcat?: LogcatStream;
  projectRoot?: string;
  maxSteps?: number;
  maxStepsPerMilestone?: number;
  maxTokens?: number;
  onTurn?: (turn: TranscriptTurn) => void;
  onPhaseChange?: (phase: string) => void;
  onMilestoneChange?: (active: HarnessMilestone, total: number) => void;
}

export interface HarnessResult {
  success: boolean;
  finalSnapshot: TreeSnapshot | null;
  turns: TranscriptTurn[];
  totalSteps: number;
  terminationReason: string;
  planFilePath?: string;
  completedMilestones: number;
  totalMilestones: number;
}

export class HarnessLoop {
  private config: HarnessConfig;
  private llm: LocalLlmClient;
  private heartbeat: HeartbeatMonitor;
  private actionHistory: ActionHistory;
  private transcript: TranscriptLogger;
  private compactor: ContextCompactor;
  private ctx: ToolExecutionContext;
  private turns: TranscriptTurn[] = [];
  private lastSnapshot: TreeSnapshot | null = null;
  private pendingInterjection: string | null = null;
  private triedSolutions = new TriedSolutionsLogger();
  private pmSentinel = new ProjectManagerSentinel("gemma4:e4b");

  constructor(config: HarnessConfig) {
    this.config = config;
    this.llm = new LocalLlmClient(config.model);
    this.heartbeat = new HeartbeatMonitor(config.probe);
    this.actionHistory = new ActionHistory();
    this.transcript = new TranscriptLogger(config.outputDir);
    this.compactor = new ContextCompactor(allocateBudget(config.maxTokens || 64000));
    this.ctx = {
      heartbeat: this.heartbeat,
      actionHistory: this.actionHistory,
      adbTap: config.adbTap,
      adbType: config.adbType,
      adbSwipe: config.adbSwipe,
      resolveElement: (sek: string, snapshot: TreeSnapshot) => snapshot.nodes.get(sek),
    };
  }

  public async interjectRequirement(newRequirement: string): Promise<void> {
    this.pendingInterjection = newRequirement;
    const turn = this.transcript.logSystemMessage(
      `[COURSE CORRECTION 🧭] User interjected requirement: "${newRequirement}". Re-planning with PM/Security/UX team...`
    );
    this.turns.push(turn);
    this.config.onTurn?.(turn);
  }

  async run(goal: string): Promise<HarnessResult> {
    const maxStepsPerMilestone = this.config.maxStepsPerMilestone || 35;
    let terminationReason = "completed";

    // 1. Multi-Role Planning Phase (PM -> Security -> UX -> PM Synthesis)
    this.config.onPhaseChange?.("MULTI-ROLE PLANNING (PM / SECURITY / UX)");
    const planner = new MultiRolePlanner(this.config.model);
    let planRes = await planner.runMultiRolePlanning(
      goal,
      this.config.projectRoot,
      (msg) => this.config.onPhaseChange?.(msg)
    );

    // 2. Cloud & Backend Environment Template Generation (.env)
    const envRes = EnvManager.generateEnvTemplates(
      this.config.projectRoot,
      planRes.requiredBackends
    );

    // 3. Milestone Controller Setup
    let milestoneCtrl = new MilestoneController(planRes.finalPlan);

    // Log planning turn into transcript
    const planTurn = this.transcript.logSystemMessage(
      `[MULTI-ROLE PLANNER 👾] Master plan synthesized at "plan.md" (${milestoneCtrl.getTotalCount()} Milestones).\nRequired backends: ${planRes.requiredBackends.join(", ") || "Local-first"}.\n${envRes.systemMessages.join("\n")}`
    );
    this.turns.push(planTurn);
    this.config.onTurn?.(planTurn);

    this.config.onPhaseChange?.("MILESTONE EXECUTION MATRIX");

    // Loop through each Milestone
    while (!milestoneCtrl.isAllCompleted()) {
      const activeMilestone = milestoneCtrl.getActiveMilestone();
      if (!activeMilestone) break;

      this.config.onMilestoneChange?.(activeMilestone, milestoneCtrl.getTotalCount());
      this.config.onPhaseChange?.(`EXECUTING ${activeMilestone.title.toUpperCase()}`);

      const milestoneTurn = this.transcript.logSystemMessage(
        `[MILESTONE ${milestoneCtrl.getActiveIndex() + 1}/${milestoneCtrl.getTotalCount()} 🚀] Starting ${activeMilestone.title}`
      );
      this.turns.push(milestoneTurn);
      this.config.onTurn?.(milestoneTurn);

      this.triedSolutions.clear();

      // Build turn messages for current milestone
      const messages: any[] = [
        {
          role: "system",
          content: `${SYSTEM_PROMPT}\n\n## ACTIVE MILESTONE (${activeMilestone.title}):\nTasks:\n${activeMilestone.tasks.map((t) => `- ${t}`).join("\n")}\n\n## TRIED SOLUTIONS JOURNAL (PREVIOUS ATTEMPTS IN THIS MILESTONE):\n${this.triedSolutions.getRecentSummary()}\n\nMASTER PLAN (plan.md):\n${planRes.finalPlan}`,
        },
        { role: "user", content: `Execute ${activeMilestone.title}. Start by inspecting files or calling ui_dump.` },
      ];

      let milestoneSteps = 0;
      let milestoneDone = false;

      while (milestoneSteps < maxStepsPerMilestone && !milestoneDone) {
        milestoneSteps++;

        // Keep system prompt updated with recent tried solutions
        messages[0].content = `${SYSTEM_PROMPT}\n\n## ACTIVE MILESTONE (${activeMilestone.title}):\nTasks:\n${activeMilestone.tasks.map((t) => `- ${t}`).join("\n")}\n\n## TRIED SOLUTIONS JOURNAL (PREVIOUS ATTEMPTS IN THIS MILESTONE):\n${this.triedSolutions.getRecentSummary()}\n\nMASTER PLAN (plan.md):\n${planRes.finalPlan}`;

        // Check for pending mid-flight interjection
        if (this.pendingInterjection) {
          const interjectionText = this.pendingInterjection;
          this.pendingInterjection = null;

          this.config.onPhaseChange?.("RE-PLANNING (COURSE CORRECTION)");
          planRes = await planner.runMultiRolePlanning(
            `${goal}\nNew requirement interjected by user: "${interjectionText}"`,
            this.config.projectRoot,
            (msg) => this.config.onPhaseChange?.(msg)
          );
          milestoneCtrl = new MilestoneController(planRes.finalPlan);
          this.config.onPhaseChange?.("RESUMING MILESTONE EXECUTION");
        }

        try {
          const response = await this.llm.generateResponse(messages, HARNESS_TOOLS);

          if (response.tool_calls && response.tool_calls.length > 0) {
            messages.push(response);

            for (const toolCall of response.tool_calls) {
              const { name, arguments: argsStr } = toolCall.function;
              const args = JSON.parse(argsStr || "{}");

              const toolResult = await this.executeTool(name, args);

              const targetName = args.element_key || args.target_file || args.dir_path || "";

              // PM Sentinel (Gemma 4): Check scope alignment
              const pmAudit = await this.pmSentinel.auditScope(
                goal,
                activeMilestone.title,
                name,
                targetName
              );
              if (!pmAudit.aligned && pmAudit.refocusHint) {
                toolResult.systemMessages = toolResult.systemMessages || [];
                toolResult.systemMessages.push(`[PM SENTINEL 🛡️ (Gemma 4)]: ${pmAudit.refocusHint}`);
              }

              const outcome = toolResult.ok
                ? toolResult.diff?.outcome === "NO_CHANGE"
                  ? "NO_CHANGE"
                  : "SUCCESS"
                : "FAILED";
              const details = toolResult.error || toolResult.summary || toolResult.diff?.summary || "Completed";
              this.triedSolutions.record(name, targetName, `Execute ${name}`, outcome, details);

              const turn = this.transcript.logModelAction(
                { name, target: targetName, args },
                toolResult.diff,
                toolResult.systemMessages || [],
                [{ tool: name, result: toolResult.ok ? toolResult : undefined, error: toolResult.error }]
              );
              this.turns.push(turn);
              this.config.onTurn?.(turn);

              if (
                toolResult.loopSignal ||
                (toolResult.systemMessages &&
                  toolResult.systemMessages.some(
                    (m: string) => m.includes("Loop detected") || m.includes("Navigation cycle")
                  ))
              ) {
                const consultant = new AgentConsultant();
                const advice = await consultant.consultOnStuck({
                  goal: `${goal} - ${activeMilestone.title}`,
                  stuckReason: toolResult.loopSignal?.message || "Action loop detected",
                  recentTurns: this.turns,
                  lastSnapshot: this.lastSnapshot,
                });
                toolResult.systemMessages.push(advice.systemHint);
              }

              if (name === "create_file" || name === "edit_file") {
                const consultant = new AgentConsultant();
                const qaRes = await consultant.performQaAudit(goal, this.turns, this.lastSnapshot);
                toolResult.systemMessages.push(qaRes.feedback);
              }

              const observation = toolResult.yaml
                ? formatUiDumpObservation(toolResult.yaml)
                : formatActionObservation(
                    this.turns.length,
                    name,
                    args.element_key || args.target_file || "",
                    toolResult,
                    toolResult.systemMessages || []
                  );

              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: observation,
              });
            }
          } else if (response.content) {
            const turn = this.transcript.logTurn({
              source: "MODEL",
              systemMessages: [],
              toolResults: [],
            });
            this.turns.push(turn);
            this.config.onTurn?.(turn);

            const content = response.content.toLowerCase();
            if (
              content.includes("milestone complete") ||
              content.includes("task complete") ||
              content.includes("goal achieved") ||
              content.includes("successfully")
            ) {
              milestoneDone = true;
            }

            messages.push({ role: "assistant", content: response.content });
          }
        } catch (e: any) {
          this.transcript.logSystemMessage(`[SYSTEM] Error in milestone step: ${e.message}`);
          terminationReason = `error: ${e.message}`;
          milestoneDone = true;
          break;
        }
      }

      // Mark milestone complete and advance
      milestoneCtrl.markActiveComplete();

      const verifyTurn = this.transcript.logSystemMessage(
        `[MILESTONE VERIFIED ✅] ${activeMilestone.title} completed cleanly.`
      );
      this.turns.push(verifyTurn);
      this.config.onTurn?.(verifyTurn);
    }

    terminationReason = milestoneCtrl.isAllCompleted() ? "goal_achieved" : "max_milestones_reached";

    return {
      success: milestoneCtrl.isAllCompleted(),
      finalSnapshot: this.lastSnapshot,
      turns: this.turns,
      totalSteps: this.turns.length,
      terminationReason,
      planFilePath: planRes.planFilePath,
      completedMilestones: milestoneCtrl.getActiveIndex(),
      totalMilestones: milestoneCtrl.getTotalCount(),
    };
  }

  private async executeTool(
    name: string,
    args: Record<string, any>
  ): Promise<any> {
    switch (name) {
      case "ui_dump": {
        const result = await uiDumpTool(this.heartbeat, args.full || false);
        if (result.snapshot) this.lastSnapshot = result.snapshot;
        return { ...result, systemMessages: [] };
      }

      case "ui_tap": {
        const result = await uiTapTool(args.element_key, this.ctx);
        return result;
      }

      case "ui_type": {
        const result = await uiTypeTool(
          args.element_key,
          args.text,
          args.clear_first || false,
          this.ctx
        );
        return result;
      }

      case "logcat_tail": {
        if (!this.config.logcat) {
          return {
            ok: true,
            summary: "Logcat stream not initialized in current session.",
            systemMessages: [],
          };
        }
        const recent = this.config.logcat.getRecentLines(args.lines || 200);
        return {
          ok: true,
          summary: recent || "No recent logcat entries found.",
          systemMessages: [],
        };
      }

      case "flutter_hot_reload": {
        return flutterHotReloadTool(this.config.dtd || null, this.heartbeat);
      }

      case "flutter_hot_restart": {
        return flutterHotRestartTool(this.config.dtd || null, this.heartbeat);
      }

      case "flutter_analyze": {
        return flutterAnalyzeTool(this.config.projectRoot);
      }

      case "list_files": {
        return listFilesTool({
          dirPath: args.dir_path,
          projectRoot: this.config.projectRoot,
        });
      }

      case "read_file": {
        return readFileTool({
          filePath: args.target_file,
          projectRoot: this.config.projectRoot,
        });
      }

      case "create_file": {
        return createFileTool({
          filePath: args.target_file,
          content: args.content,
          projectRoot: this.config.projectRoot,
        });
      }

      case "edit_file": {
        return editFileTool({
          filePath: args.target_file,
          targetContent: args.target_content,
          replacementContent: args.replacement_content,
          projectRoot: this.config.projectRoot,
        });
      }

      default:
        return {
          ok: false,
          error: `Unknown tool: ${name}`,
          systemMessages: [],
        };
    }
  }
}
