import { RawNode } from '../../core/grounding/types.js';

export function parseUiAutomatorXml(xml: string): RawNode {
  if (!xml || xml.trim().length === 0) {
    throw new Error('Empty XML');
  }

  const regex = /<node\s+([^>]*?)(\/?>)|<\/node>/g;
  let match;
  
  const stack: RawNode[] = [];
  let root: RawNode | null = null;
  
  while ((match = regex.exec(xml)) !== null) {
    const fullMatch = match[0];
    const attrsStr = match[1];
    const selfClosing = match[2];
    
    if (fullMatch === '</node>') {
      const node = stack.pop();
      if (!node) continue;
      if (stack.length > 0) {
        stack[stack.length - 1].children.push(node);
      } else {
        if (!root) root = node;
      }
    } else {
      // It's a <node ...>
      const node: RawNode = {
        className: extractAttr(attrsStr, 'class', ''),
        resourceId: extractAttr(attrsStr, 'resource-id', ''),
        text: extractAttr(attrsStr, 'text', ''),
        contentDesc: extractAttr(attrsStr, 'content-desc', ''),
        packageName: extractAttr(attrsStr, 'package', ''),
        bounds: parseBounds(extractAttr(attrsStr, 'bounds', '')),
        clickable: extractAttr(attrsStr, 'clickable', 'false') === 'true',
        focusable: extractAttr(attrsStr, 'focusable', 'false') === 'true',
        scrollable: extractAttr(attrsStr, 'scrollable', 'false') === 'true',
        enabled: extractAttr(attrsStr, 'enabled', 'false') === 'true',
        children: [],
      };
      
      if (selfClosing === '/>') {
        if (stack.length > 0) {
          stack[stack.length - 1].children.push(node);
        } else {
          if (!root) root = node;
        }
      } else {
        stack.push(node);
      }
    }
  }
  
  if (!root) {
    if (stack.length === 1) {
      return stack[0];
    }
    throw new Error('No root node found');
  }
  
  return root;
}

function extractAttr(attrsStr: string, name: string, defaultValue: string): string {
  // Use regex that allows optional spaces around equals, and matches inside quotes
  const match = attrsStr.match(new RegExp(`${name}="([^"]*)"`));
  if (!match) return defaultValue;
  return match[1]
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}

function parseBounds(boundsStr: string): [number, number, number, number] {
  const match = boundsStr.match(/\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]/);
  if (match) {
    return [
      parseInt(match[1], 10),
      parseInt(match[2], 10),
      parseInt(match[3], 10),
      parseInt(match[4], 10)
    ];
  }
  return [0, 0, 0, 0];
}
