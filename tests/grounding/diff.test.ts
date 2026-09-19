import { describe, it, expect } from "vitest";
import { RawNode } from "../../src/core/grounding/types.js";
import { groundAndroidTree } from "../../src/core/grounding/ground.js";
import { computeUIDiff } from "../../src/core/grounding/diff.js";

describe("Pre/Post UIDiff Algorithm", () => {
  it("should detect NAVIGATED when screen scope changes", () => {
    const beforeRoot: RawNode = {
      className: "com.app.AuthActivity",
      bounds: [0, 0, 1080, 1920],
      clickable: false,
      focusable: false,
      scrollable: false,
      enabled: true,
      children: [
        {
          className: "android.widget.Button",
          resourceId: "com.app:id/login",
          text: "Log In",
          bounds: [0, 0, 100, 50],
          clickable: true,
          focusable: true,
          scrollable: false,
          enabled: true,
          children: [],
        },
      ],
    };

    const afterRoot: RawNode = {
      className: "com.app.DashboardActivity",
      bounds: [0, 0, 1080, 1920],
      clickable: false,
      focusable: false,
      scrollable: false,
      enabled: true,
      children: [
        {
          className: "android.widget.TextView",
          text: "Welcome Home",
          bounds: [0, 0, 100, 50],
          clickable: false,
          focusable: false,
          scrollable: false,
          enabled: true,
          children: [],
        },
      ],
    };

    const before = groundAndroidTree(beforeRoot);
    const after = groundAndroidTree(afterRoot);

    const diff = computeUIDiff(before, after, { name: "ui_tap", target: "id:login" });
    expect(diff.outcome).toBe("NAVIGATED");
    expect(diff.summary).toContain("Navigated from authactivity to dashboardactivity");
  });

  it("should detect NO_CHANGE when UI trees are identical", () => {
    const root: RawNode = {
      className: "com.app.AuthActivity",
      bounds: [0, 0, 1080, 1920],
      clickable: false,
      focusable: false,
      scrollable: false,
      enabled: true,
      children: [
        {
          className: "android.widget.Button",
          resourceId: "com.app:id/login",
          text: "Log In",
          bounds: [0, 0, 100, 50],
          clickable: true,
          focusable: true,
          scrollable: false,
          enabled: true,
          children: [],
        },
      ],
    };

    const before = groundAndroidTree(root);
    const after = groundAndroidTree(root);

    const diff = computeUIDiff(before, after, { name: "ui_tap", target: "id:login" });
    expect(diff.outcome).toBe("NO_CHANGE");
    expect(diff.summary).toBe("No UI change detected.");
  });

  it("should detect ERROR_STATE when error text surfaces", () => {
    const beforeRoot: RawNode = {
      className: "com.app.AuthActivity",
      bounds: [0, 0, 1080, 1920],
      clickable: false,
      focusable: false,
      scrollable: false,
      enabled: true,
      children: [],
    };

    const afterRoot: RawNode = {
      className: "com.app.AuthActivity",
      bounds: [0, 0, 1080, 1920],
      clickable: false,
      focusable: false,
      scrollable: false,
      enabled: true,
      children: [
        {
          className: "android.widget.TextView",
          text: "Invalid credentials. Try again.",
          bounds: [40, 900, 1040, 950],
          clickable: false,
          focusable: false,
          scrollable: false,
          enabled: true,
          children: [],
        },
      ],
    };

    const before = groundAndroidTree(beforeRoot);
    const after = groundAndroidTree(afterRoot);

    const diff = computeUIDiff(before, after, { name: "ui_tap", target: "id:login" });
    expect(diff.outcome).toBe("ERROR_STATE");
    expect(diff.summary).toContain("Error surfaced: \"Invalid credentials. Try again.\"");
  });
});
