import { GroundedNode, TreeSnapshot, NodeState } from "../grounding/types.js";

export type NodeTier = "INTERACTIVE" | "CONTENT" | "STRUCTURAL";

export interface CollapseResult {
  yaml: string;
  tokenEstimate: number;
  elidedCount: number;
  truncated: boolean;
}

export function classifyGroundedNode(node: GroundedNode): NodeTier {
  if (
    node.role === "button" ||
    node.role === "text_input" ||
    node.role === "toggle" ||
    node.role === "checkbox" ||
    node.role === "radio" ||
    node.role === "tab" ||
    node.role === "dialog" ||
    node.state.focused
  ) {
    return "INTERACTIVE";
  }

  if (node.label && node.label.trim().length > 0) {
    return "CONTENT";
  }

  return "STRUCTURAL";
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function formatStateDeltas(state: NodeState): string | null {
  const deltas: string[] = [];
  if (!state.enabled) deltas.push("disabled");
  if (state.focused) deltas.push("focused");
  if (state.selected) deltas.push("selected");
  if (state.checked === true) deltas.push("checked");
  if (state.checked === false) deltas.push("unchecked");
  return deltas.length > 0 ? `[${deltas.join(",")}]` : null;
}

function formatElement(node: GroundedNode): string {
  const parts = [
    `${node.sek}`,
    `role: ${node.role}`,
    `label: ${JSON.stringify(node.label)}`,
  ];

  const stateStr = formatStateDeltas(node.state);
  if (stateStr) parts.push(stateStr);

  return parts.join("  ");
}

function scoreElement(line: string, index: number): number {
  if (line.includes("role: dialog")) return 1100 - index;
  if (line.includes("role: button")) return 1000 - index;
  if (line.includes("role: text_input")) return 900 - index;
  if (line.includes("role: text")) return 500 - index;
  return 100 - index;
}

function applyElementBudget(
  elements: string[],
  budgetTokens: number,
  onTruncate: () => void
): string[] {
  const perElement = 15;
  const maxElements = Math.floor(budgetTokens / perElement);

  if (elements.length <= maxElements) return elements;

  const scored = elements.map((line, index) => ({
    line,
    score: scoreElement(line, index),
    index,
  }));

  scored.sort((a, b) => b.score - a.score);
  const kept = scored.slice(0, maxElements).sort((a, b) => a.index - b.index);

  onTruncate();
  return kept.map((s) => s.line);
}

function walkForCollapse(
  node: GroundedNode,
  out: string[],
  onElide: () => void,
  seen: Set<string>
): void {
  const tier = classifyGroundedNode(node);

  if (tier === "INTERACTIVE" || tier === "CONTENT") {
    if (seen.has(node.sek)) {
      out.push(`${node.sek}  [duplicate]`);
    } else {
      seen.add(node.sek);
      out.push(formatElement(node));
    }
  } else {
    onElide();
  }

  for (const child of node.children) {
    walkForCollapse(child, out, onElide, seen);
  }
}

export function collapseTree(
  snapshot: TreeSnapshot,
  budgetTokens: number = 2000
): CollapseResult {
  const lines: string[] = [];
  let elided = 0;
  let truncated = false;

  lines.push(`screen: ${snapshot.screenScope}`);

  const elements: string[] = [];
  const seenSEKs = new Set<string>();

  for (const rootSek of snapshot.rootSEKs) {
    const rootNode = snapshot.nodes.get(rootSek);
    if (rootNode) {
      walkForCollapse(rootNode, elements, () => elided++, seenSEKs);
    }
  }

  const capped = applyElementBudget(elements, budgetTokens, () => (truncated = true));

  lines.push("elements:");
  for (const elem of capped) {
    lines.push("  - " + elem);
  }

  const markers: string[] = [];
  if (elided > 0) markers.push(`${elided} structural nodes elided`);
  if (truncated) markers.push("element list truncated to fit budget");
  if (markers.length > 0) lines.push(`# ${markers.join("; ")}`);

  const yaml = lines.join("\n");
  return {
    yaml,
    tokenEstimate: estimateTokens(yaml),
    elidedCount: elided,
    truncated,
  };
}
