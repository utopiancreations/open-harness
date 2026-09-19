import {
  TreeSnapshot,
  UIDiff,
  DiffOutcome,
  GroundedNodeSummary,
  ModifiedNodeSummary,
  GroundedNode,
} from "./types.js";

function summarizeNode(node: GroundedNode): GroundedNodeSummary {
  return {
    sek: node.sek,
    role: node.role,
    label: node.label,
  };
}

function pickSalient(
  added: GroundedNodeSummary[],
  removed: GroundedNodeSummary[],
  modified: ModifiedNodeSummary[]
): GroundedNodeSummary | undefined {
  const dialog = added.find((n) => n.role === "dialog");
  if (dialog) return dialog;

  const errorText = added.find((n) => n.label.toLowerCase().includes("error") || n.label.toLowerCase().includes("failed"));
  if (errorText) return errorText;

  const button = added.find((n) => n.role === "button");
  if (button) return button;

  if (added.length > 0) return added[0];
  if (modified.length > 0) {
    const m = modified[0];
    return { sek: m.sek, role: "unknown", label: `${m.field}: ${m.from} -> ${m.to}` };
  }

  return undefined;
}

export function computeUIDiff(
  before: TreeSnapshot,
  after: TreeSnapshot,
  action: { name: string; target: string },
  confidence: "high" | "low" = "high"
): UIDiff {
  // 1. Screen scope change -> NAVIGATED
  if (before.screenScope !== after.screenScope) {
    const addedSummaries = Array.from(after.nodes.values()).slice(0, 5).map(summarizeNode);
    const removedSummaries = Array.from(before.nodes.values()).slice(0, 5).map(summarizeNode);

    return {
      action: action.name,
      targetSEK: action.target,
      outcome: "NAVIGATED",
      confidence,
      summary: `Navigated from ${before.screenScope} to ${after.screenScope}.`,
      added: addedSummaries,
      removed: removedSummaries,
      modified: [],
      salientChange: addedSummaries[0],
    };
  }

  // 2. Node Key Comparisons
  const beforeKeys = new Set(before.nodes.keys());
  const afterKeys = new Set(after.nodes.keys());

  const addedSEKs = Array.from(afterKeys).filter((k) => !beforeKeys.has(k));
  const removedSEKs = Array.from(beforeKeys).filter((k) => !afterKeys.has(k));
  const sharedSEKs = Array.from(beforeKeys).filter((k) => afterKeys.has(k));

  const modified: ModifiedNodeSummary[] = [];

  for (const sek of sharedSEKs) {
    const b = before.nodes.get(sek)!;
    const a = after.nodes.get(sek)!;

    if (b.label !== a.label) {
      modified.push({ sek, field: "text", from: b.label, to: a.label });
    }
    if (b.state.enabled !== a.state.enabled) {
      modified.push({ sek, field: "enabled", from: b.state.enabled, to: a.state.enabled });
    }
    if (b.state.focused !== a.state.focused) {
      modified.push({ sek, field: "focused", from: b.state.focused, to: a.state.focused });
    }
  }

  // 3. Error state check
  const errorNode = Array.from(after.nodes.values()).find(
    (n) => n.label.toLowerCase().includes("invalid") || n.label.toLowerCase().includes("error")
  );

  if (errorNode && !Array.from(before.nodes.values()).some((n) => n.sek === errorNode.sek)) {
    const errSummary = summarizeNode(errorNode);
    return {
      action: action.name,
      targetSEK: action.target,
      outcome: "ERROR_STATE",
      confidence,
      summary: `Error surfaced: "${errorNode.label}"`,
      added: addedSEKs.slice(0, 5).map((k) => summarizeNode(after.nodes.get(k)!)),
      removed: removedSEKs.slice(0, 5).map((k) => summarizeNode(before.nodes.get(k)!)),
      modified,
      salientChange: errSummary,
    };
  }

  // 4. No change check
  if (addedSEKs.length === 0 && removedSEKs.length === 0 && modified.length === 0) {
    return {
      action: action.name,
      targetSEK: action.target,
      outcome: "NO_CHANGE",
      confidence,
      summary: "No UI change detected.",
      added: [],
      removed: [],
      modified: [],
    };
  }

  // 5. General mutation
  const added = addedSEKs.slice(0, 5).map((k) => summarizeNode(after.nodes.get(k)!));
  const removed = removedSEKs.slice(0, 5).map((k) => summarizeNode(before.nodes.get(k)!));
  const salient = pickSalient(added, removed, modified);

  let summaryText = `Executed ${action.name} on ${action.target} -> MUTATED.`;
  if (salient) {
    summaryText += ` Salient change: ${salient.sek} (${salient.label})`;
  }

  return {
    action: action.name,
    targetSEK: action.target,
    outcome: "MUTATED",
    confidence,
    summary: summaryText,
    added,
    removed,
    modified,
    salientChange: salient,
  };
}
