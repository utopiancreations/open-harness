import { describe, it, expect } from "vitest";
import { RawNode } from "../../src/core/grounding/types.js";
import { groundAndroidTree } from "../../src/core/grounding/ground.js";
import { collapseTree } from "../../src/core/compactor/tree_collapse.js";

describe("Hierarchical Tree Collapsor", () => {
  it("should collapse structural container nodes while keeping interactive and content nodes", () => {
    const rawTree: RawNode = {
      className: "android.widget.FrameLayout",
      bounds: [0, 0, 1080, 1920],
      clickable: false,
      focusable: false,
      scrollable: false,
      enabled: true,
      children: [
        {
          className: "android.widget.LinearLayout",
          bounds: [0, 0, 1080, 1920],
          clickable: false,
          focusable: false,
          scrollable: false,
          enabled: true,
          children: [
            {
              className: "android.widget.TextView",
              text: "Welcome Back",
              resourceId: "com.app:id/header",
              bounds: [40, 80, 400, 140],
              clickable: false,
              focusable: false,
              scrollable: false,
              enabled: true,
              children: [],
            },
            {
              className: "android.widget.EditText",
              resourceId: "com.app:id/email",
              bounds: [40, 400, 1040, 500],
              clickable: true,
              focusable: true,
              scrollable: false,
              enabled: true,
              children: [],
            },
            {
              className: "android.widget.Button",
              text: "Log In",
              resourceId: "com.app:id/login",
              bounds: [40, 700, 1040, 800],
              clickable: true,
              focusable: true,
              scrollable: false,
              enabled: true,
              children: [],
            },
          ],
        },
      ],
    };

    const snapshot = groundAndroidTree(rawTree);
    const result = collapseTree(snapshot, 2000);

    expect(result.yaml).toContain("screen: root");
    expect(result.yaml).toContain("id:header");
    expect(result.yaml).toContain("id:email");
    expect(result.yaml).toContain("id:login");
    expect(result.elidedCount).toBeGreaterThan(0);
    expect(result.yaml).toContain("structural nodes elided");
  });
});
