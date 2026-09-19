import React, { useState, useEffect, useRef } from "react";
import { render, Text, Box, useInput } from "ink";
import { Command } from "commander";
import { HarnessLoop, HarnessResult } from "../core/harness/loop.js";
import { TranscriptTurn } from "../core/harness/transcript.js";
import { DeviceManager } from "../mobile_bridge/android/device.js";
import { EvalRunner } from "../eval/runner.js";
import { createTaskANavigation } from "../eval/tasks/task_a_navigation.js";
import { createTaskBFormInput } from "../eval/tasks/task_b_form_input.js";
import { createTaskCBugFix } from "../eval/tasks/task_c_bug_fix.js";
import { generateHandoverReport, HandoverSummary } from "../core/harness/handover_report.js";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const CyberpunkHeader = () => (
  <Box flexDirection="column" borderStyle="double" borderColor="cyan" paddingX={1} paddingY={0}>
    <Box justifyContent="space-between">
      <Text color="cyan" bold>
        ⚡ OPEN HARNESS // CYBERNETIC AGENT MATRIX ⚡
      </Text>
      <Text color="magenta" bold>
        v0.1.0-CYBER
      </Text>
    </Box>
    <Text color="gray">
      [Qwen 3.8 Agent Core] • [Gemma 4 Subagent QA] • [Tiered Heartbeat Settle] • [M5 Max 128GB]
    </Text>
  </Box>
);

const CyberpunkStatusGrid = ({
  deviceInfo,
  goal,
  status,
  turnsCount,
}: {
  deviceInfo: string;
  goal: string;
  status: string;
  turnsCount: number;
}) => (
  <Box flexDirection="column" marginTop={1} borderColor="magenta" borderStyle="single" padding={1}>
    <Box justifyContent="space-between">
      <Text color="green" bold>
        ◈ SYSTEM STATUS MATRIX
      </Text>
      <Text color="yellow" bold>
        TURNS: {turnsCount}
      </Text>
    </Box>
    <Box marginTop={1}>
      <Text color="cyan" bold>
        🛰️ DEVICE TARGET:{" "}
      </Text>
      <Text color="white">{deviceInfo}</Text>
    </Box>
    <Box>
      <Text color="magenta" bold>
        👾 CONSULTANT MODEL:{" "}
      </Text>
      <Text color="white">Gemma 4 (31B Subagent Auditor Active)</Text>
    </Box>
    <Box>
      <Text color="yellow" bold>
        ❯ PRIMARY OBJECTIVE:{" "}
      </Text>
      <Text color="cyan" bold italic>
        "{goal || "No goal specified. Enter a goal below."}"
      </Text>
    </Box>
    <Box marginTop={1}>
      <Text color="blue" bold>
        ⚡ STATUS:{" "}
      </Text>
      <Text color="green" bold>
        {status}
      </Text>
    </Box>
  </Box>
);

const CyberpunkTurnFeed = ({ turns }: { turns: TranscriptTurn[] }) => {
  const maxVisible = 7;
  const hiddenCount = Math.max(0, turns.length - maxVisible);
  const visibleTurns = turns.slice(-maxVisible);

  return (
    <Box flexDirection="column" marginTop={1} borderColor="cyan" borderStyle="round" padding={1}>
      <Box justifyContent="space-between">
        <Text color="cyan" bold>
          👾 LIVE AGENT & SUBAGENT STREAM ({turns.length} TURNS TOTAL)
        </Text>
        {hiddenCount > 0 && (
          <Text color="gray" italic>
            ▲ ({hiddenCount} earlier turns scrolled above...)
          </Text>
        )}
      </Box>

      {turns.length === 0 ? (
        <Text color="gray" italic>
          [Awaiting initial UI dump & plan execution...]
        </Text>
      ) : (
        visibleTurns.map((t, idx) => {
          const hasSubagentAdvice = t.systemMessages?.some(
            (m) => m.includes("CYBER-CONSULTANT") || m.includes("QA-AUDITOR")
          );
          const actionText = t.action ? `${t.action.name} ➔ ${t.action.target}` : "Thinking";

          return (
            <Box key={idx} flexDirection="column" marginTop={0}>
              <Box>
                <Text color="magenta" bold>
                  [{t.timestamp.split("T")[1]?.slice(0, 8) || ""}] Step {t.index}{" "}
                </Text>

                <Text color="yellow" bold>
                  ({t.source}){" "}
                </Text>
                <Text color="white" bold>
                  ❯ {actionText}
                </Text>
              </Box>

              {t.diff && (
                <Box marginLeft={4}>
                  <Text color="green">
                    └─ ⚡ DIFF: {t.diff.summary} (confidence: {t.diff.confidence})
                  </Text>
                </Box>
              )}

              {hasSubagentAdvice &&
                t.systemMessages
                  .filter((m) => m.includes("CYBER-CONSULTANT") || m.includes("QA-AUDITOR"))
                  .map((m, mIdx) => (
                    <Box key={mIdx} marginLeft={4}>
                      <Text color="cyan" bold italic>
                        └─ {m}
                      </Text>
                    </Box>
                  ))}
            </Box>
          );
        })
      )}
    </Box>
  );
};

const CyberpunkActivityAnchor = ({
  active,
  currentStepLabel,
}: {
  active: boolean;
  currentStepLabel: string;
}) => {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 150);
    return () => clearInterval(timer);
  }, [active]);

  return (
    <Box marginTop={1} marginX={1}>
      {active ? (
        <Box>
          <Text color="cyan" bold>
            {SPINNER_FRAMES[frameIndex]}{" "}
          </Text>
          <Text color="yellow" bold>
            [WORKING ⚡]{" "}
          </Text>
          <Text color="white" bold>
            {currentStepLabel || "Agent executing step..."}
          </Text>
        </Box>
      ) : (
        <Box>
          <Text color="green" bold>
            ●{" "}
          </Text>
          <Text color="gray" italic>
            [IDLE ⚡] Ready for next goal or command.
          </Text>
        </Box>
      )}
    </Box>
  );
};

const CyberpunkInputBox = ({
  onSubmit,
  isWorking,
}: {
  onSubmit: (text: string) => void;
  isWorking: boolean;
}) => {
  const [input, setInput] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 500);
    return () => clearInterval(timer);
  }, []);

  useInput((inputChar, key) => {
    if (key.return) {
      const trimmed = input.trim();
      if (trimmed) {
        onSubmit(trimmed);
        setInput("");
      }
      return;
    }

    if (key.backspace || key.delete) {
      setInput((prev) => prev.slice(0, -1));
      return;
    }

    if (!key.ctrl && !key.meta && inputChar) {
      setInput((prev) => prev + inputChar);
    }
  });

  return (
    <Box
      flexDirection="column"
      marginTop={1}
      borderColor={isWorking ? "yellow" : "green"}
      borderStyle="round"
      paddingX={1}
      paddingY={0}
    >
      <Box justifyContent="space-between">
        <Text color={isWorking ? "yellow" : "green"} bold>
          💬 COMMAND / GOAL INPUT CONTAINER
        </Text>
        <Text color="gray" italic>
          {isWorking ? "[AGENT EXECUTING - TYPE & PRESS ENTER TO INTERJECT / COURSE CORRECT]" : "[TYPE & PRESS ENTER TO SUBMIT]"}
        </Text>
      </Box>
      <Box marginTop={0} paddingY={0}>
        <Text color={isWorking ? "yellow" : "green"} bold>
          ❯ {isWorking ? "INTERJECT / RE-PLAN: " : "GOAL / COMMAND: "}
        </Text>
        <Text color="white" bold>
          {input}
        </Text>
        <Text color={isWorking ? "yellow" : "green"} bold>
          {cursorVisible ? "█" : " "}
        </Text>
      </Box>
    </Box>
  );
};

const HandoverReportBox = ({ result }: { result: HarnessResult }) => {
  const handover = generateHandoverReport(result, process.cwd());

  return (
    <Box flexDirection="column" marginTop={1} borderColor="green" borderStyle="double" padding={1}>
      <Text color="green" bold>
        ⚡ HARNESS EXECUTIVE HANDOVER REPORT
      </Text>
      <Box marginTop={1}>
        <Text color="cyan" bold>STATUS: </Text>
        <Text color="white">{handover.status}</Text>
      </Box>
      <Box>
        <Text color="cyan" bold>MILESTONES COMPLETED: </Text>
        <Text color="yellow" bold>
          {handover.completedMilestones} / {handover.totalMilestones}
        </Text>
      </Box>
      <Box>
        <Text color="cyan" bold>TOTAL TURNS EXECUTED: </Text>
        <Text color="white">{handover.totalSteps}</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color="magenta" bold>💡 SUGGESTED NEXT STEPS:</Text>
        {handover.suggestedNextSteps.map((step, idx) => (
          <Text key={idx} color="gray" italic>
            {step}
          </Text>
        ))}
      </Box>
    </Box>
  );
};

const HarnessDashboard = ({ initialGoal }: { initialGoal?: string }) => {
  const [goal, setGoal] = useState<string>(initialGoal || "");
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [status, setStatus] = useState<string>("Ready");
  const [isWorking, setIsWorking] = useState<boolean>(false);
  const [currentStepLabel, setCurrentStepLabel] = useState<string>("Initializing...");
  const [deviceInfo, setDeviceInfo] = useState<string>("Scanning ADB Matrix...");
  const [result, setResult] = useState<HarnessResult | null>(null);
  const harnessRef = useRef<HarnessLoop | null>(null);

  const handleInputSubmit = (text: string) => {
    if (isWorking && harnessRef.current) {
      harnessRef.current.interjectRequirement(text);
    } else {
      runAgentGoal(text);
    }
  };

  const runAgentGoal = async (targetGoal: string) => {
    setGoal(targetGoal);
    setIsWorking(true);
    setStatus("Autonomous Agent Active ⚡");
    setCurrentStepLabel("Initializing device connection...");

    const devMgr = new DeviceManager();
    try {
      const devices = await devMgr.discoverDevices();
      if (devices.length > 0) {
        setDeviceInfo(`${devices[0].id} (${devices[0].type})`);
      } else {
        setDeviceInfo("Simulated Offline Matrix Node (Mock Mode)");
      }
    } catch {
      setDeviceInfo("Simulated Offline Matrix Node (Mock Mode)");
    }

    const harness = new HarnessLoop({
      model: {
        name: "qwen3.8:latest",
        endpoint: "http://localhost:11434/v1",
        contextWindow: 65536,
      },
      probe: {
        costMs: 50,
        fast: async () => "hash_stable",
        slow: async () => ({
          hash: "hash_stable",
          snapshot: {
            timestamp: Date.now(),
            screenScope: "app_main",
            nodes: new Map(),
            rootSEKs: [],
            hash: "hash_stable",
          },
        }),
      },
      adbTap: async () => {},
      adbType: async () => {},
      adbSwipe: async () => {},
      outputDir: "./artifacts/transcripts",
      projectRoot: process.cwd(),
      maxStepsPerMilestone: 35,
      onPhaseChange: (phase) => {
        setStatus(phase);
        setCurrentStepLabel(phase);
      },
      onTurn: (turn) => {
        setTurns((prev) => [...prev, turn]);
        const actName = turn.action ? `${turn.action.name} on ${turn.action.target}` : "LLM reasoning";
        setCurrentStepLabel(`Step ${turn.index}: ${actName}`);
      },
    });

    harnessRef.current = harness;

    try {
      setCurrentStepLabel("LLM generating turn 1...");
      const res = await harness.run(targetGoal);
      setResult(res);
      setStatus(res.success ? "OBJECTIVE COMPLETED ✅" : `TERMINATED (${res.terminationReason})`);
    } catch (e: any) {
      setStatus(`ERROR: ${e.message}`);
    } finally {
      setIsWorking(false);
      setCurrentStepLabel("Completed");
    }
  };

  useEffect(() => {
    if (initialGoal) {
      runAgentGoal(initialGoal);
    }
  }, [initialGoal]);

  return (
    <Box flexDirection="column" padding={1}>
      <CyberpunkHeader />
      <CyberpunkStatusGrid
        deviceInfo={deviceInfo}
        goal={goal}
        status={status}
        turnsCount={turns.length}
      />
      <CyberpunkTurnFeed turns={turns} />
      <CyberpunkActivityAnchor active={isWorking} currentStepLabel={currentStepLabel} />
      <CyberpunkInputBox onSubmit={handleInputSubmit} isWorking={isWorking} />

      {result && <HandoverReportBox result={result} />}
    </Box>
  );
};

const program = new Command();

program
  .name("open-harness")
  .description("Autonomous coding & device-testing agent framework")
  .version("0.1.0");

program
  .command("dev")
  .description("Start Open Harness autonomous agent interactive loop")
  .argument("[goal]", "Target goal for the agent to execute")
  .action((goal) => {
    render(<HarnessDashboard initialGoal={goal} />);
  });

program
  .command("eval")
  .description("Run mobile benchmark eval suite")
  .action(async () => {
    console.log("⚡ RUNNING MOBILE EVAL BENCHMARK MATRIX...");
    const tasks = [createTaskANavigation(), createTaskBFormInput(), createTaskCBugFix()];
    const runner = new EvalRunner(tasks, {
      model: { name: "qwen3.8:latest", endpoint: "http://localhost:11434/v1", contextWindow: 65536 },
    });
    const summary = await runner.runAll();
    console.log("\n================ ⚡ CYBERPUNK EVAL BENCHMARK MATRIX ⚡ ================");
    console.log(`Timestamp:      ${summary.timestamp}`);
    console.log(`Tasks Passed:   ${summary.passedTasks}/${summary.totalTasks} (${summary.passRate.toFixed(1)}%)`);
    console.log(`Total Turns:    ${summary.totalTurns} (avg ${summary.avgTurnsPerTask.toFixed(1)} turns/task)`);
    console.log("----------------------------------------------------------------");
    for (const r of summary.results) {
      console.log(`[${r.passed ? "PASS ✅" : "FAIL ❌"}] ${r.taskName} (score: ${r.score}%) - ${r.reason}`);
    }
    console.log("=======================================================================\n");
  });

program.parse(process.argv);
