import { RawNode, NodeRole } from "./types.js";

export function inferRole(node: RawNode): NodeRole {
  const cls = (node.className || "").toLowerCase();
  const widget = (node.widgetType || "").toLowerCase();

  if (node.flutterKey) {
    if (cls.includes("button") || widget.includes("button")) return "button";
    if (cls.includes("textfield") || widget.includes("textfield")) return "text_input";
  }

  if (cls.includes("button") || widget.includes("button")) return "button";
  if (cls.includes("edittext") || cls.includes("textfield") || widget.includes("input")) return "text_input";
  if (cls.includes("checkbox")) return "checkbox";
  if (cls.includes("switch") || cls.includes("toggle")) return "toggle";
  if (cls.includes("radio")) return "radio";
  if (cls.includes("tab")) return "tab";
  if (cls.includes("dialog")) return "dialog";
  if (cls.includes("imageview") || widget.includes("image")) return "image";
  if (cls.includes("scrollview") || cls.includes("recyclerview") || cls.includes("listview")) return "scroll_container";
  if (cls.includes("textview") || cls.includes("text")) {
    if (node.clickable) return "button";
    return "text";
  }

  if (node.clickable) return "button";
  if (node.scrollable) return "scroll_container";

  return "unknown";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}
