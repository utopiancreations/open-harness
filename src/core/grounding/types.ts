// Raw node extracted from uiautomator XML or Flutter widget tree
export interface RawNode {
  className: string;
  resourceId?: string;
  text?: string;
  contentDesc?: string;
  bounds: [number, number, number, number];
  clickable: boolean;
  focusable: boolean;
  scrollable: boolean;
  enabled: boolean;
  packageName?: string;
  flutterKey?: string;
  widgetType?: string;
  children: RawNode[];
}

// Semantic roles for UI elements
export type NodeRole =
  | "button"
  | "text_input"
  | "text"
  | "toggle"
  | "checkbox"
  | "radio"
  | "list_item"
  | "tab"
  | "image"
  | "icon"
  | "scroll_container"
  | "dialog"
  | "menu"
  | "unknown";

// Observable state of a UI node
export interface NodeState {
  enabled: boolean;
  focused: boolean;
  selected: boolean;
  checked?: boolean;
  visible: boolean;
}

// Grounded node presented to the agent
export interface GroundedNode {
  sek: string;
  role: NodeRole;
  label: string;
  state: NodeState;
  bounds: [number, number, number, number];
  children: GroundedNode[];
}

// Full screen snapshot container
export interface TreeSnapshot {
  timestamp: number;
  screenScope: string;
  nodes: Map<string, GroundedNode>;
  rootSEKs: string[];
  hash: string;
}

// Action outcomes
export type DiffOutcome = "NAVIGATED" | "MUTATED" | "NO_CHANGE" | "ERROR_STATE";

export interface GroundedNodeSummary {
  sek: string;
  role: NodeRole;
  label: string;
}

export interface ModifiedNodeSummary {
  sek: string;
  field: "text" | "enabled" | "focused" | "checked" | "visible";
  from: string | boolean;
  to: string | boolean;
}

// Pre/Post Action UI Diff
export interface UIDiff {
  action: string;
  targetSEK: string;
  outcome: DiffOutcome;
  confidence: "high" | "low";
  summary: string;
  added: GroundedNodeSummary[];
  removed: GroundedNodeSummary[];
  modified: ModifiedNodeSummary[];
  salientChange?: GroundedNodeSummary;
}

// Action execution tracking
export interface ActionRecord {
  name: string;
  target: string;
  timestamp: number;
}
