import { RawNode, GroundedNode, TreeSnapshot } from "./types.js";
import { generateSEK, nearestScope } from "./sek.js";
import { inferRole } from "./roles.js";

export function groundNode(
  raw: RawNode,
  ancestors: RawNode[] = [],
  nodesMap: Map<string, GroundedNode> = new Map()
): GroundedNode {
  const sek = generateSEK(raw, ancestors);
  const role = inferRole(raw);
  const label = (raw.text || raw.contentDesc || raw.flutterKey || raw.resourceId || "").trim();

  const currentAncestors = [...ancestors, raw];
  const groundedChildren: GroundedNode[] = [];

  for (const child of raw.children) {
    const gChild = groundNode(child, currentAncestors, nodesMap);
    groundedChildren.push(gChild);
  }

  const grounded: GroundedNode = {
    sek,
    role,
    label,
    state: {
      enabled: raw.enabled,
      focused: raw.focusable,
      selected: false,
      visible: true,
    },
    bounds: raw.bounds,
    children: groundedChildren,
  };

  nodesMap.set(sek, grounded);
  return grounded;
}

export function groundAndroidTree(root: RawNode): TreeSnapshot {
  const nodes = new Map<string, GroundedNode>();
  const groundedRoot = groundNode(root, [], nodes);
  const scope = nearestScope([root]);

  const hashStr = Array.from(nodes.keys()).sort().join("|");
  
  return {
    timestamp: Date.now(),
    screenScope: scope,
    nodes,
    rootSEKs: [groundedRoot.sek],
    hash: hashStr,
  };
}
