import { RawNode } from "./types.js";
import { inferRole, slugify } from "./roles.js";

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).substring(0, 6);
}

export function nearestScope(ancestors: RawNode[]): string {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const a = ancestors[i];
    const cls = a.className || "";
    const widget = a.widgetType || "";
    if (cls.includes("Activity") || widget === "Scaffold" || cls.includes("Dialog") || widget.includes("Dialog")) {
      const parts = cls.split(".");
      const name = parts[parts.length - 1] || widget;
      return slugify(name) || "screen";
    }
  }
  return "root";
}

export function generateSEK(node: RawNode, ancestors: RawNode[]): string {
  // 1. Flutter Key (Gold standard)
  if (node.flutterKey) {
    return `key:${node.flutterKey}`;
  }

  // 2. Resource ID
  if (node.resourceId) {
    const short = node.resourceId.split("/").pop()!;
    return `id:${short}`;
  }

  // 3. Content + Role + Screen Scope
  const text = (node.text ?? node.contentDesc ?? "").trim();
  if (text) {
    const role = inferRole(node);
    const scope = nearestScope(ancestors);
    const slug = slugify(text);
    return `${scope}/${role}:${slug || "elem"}`;
  }

  // 4. Structural Path Hash (Fallback)
  const path = ancestors
    .map((a, idx) => {
      const child = idx < ancestors.length - 1 ? ancestors[idx + 1] : node;
      return `${inferRole(a)}[${a.children.indexOf(child)}]`;
    })
    .join("/");
  return `path:${simpleHash(path || "root")}`;
}
