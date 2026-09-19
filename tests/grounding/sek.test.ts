import { describe, it, expect } from "vitest";
import { RawNode } from "../../src/core/grounding/types.js";
import { generateSEK } from "../../src/core/grounding/sek.js";
import { groundAndroidTree } from "../../src/core/grounding/ground.js";

describe("SEK Generator", () => {
  it("should prioritize Flutter Key when available", () => {
    const raw: RawNode = {
      className: "android.widget.Button",
      flutterKey: "login_button",
      bounds: [0, 0, 100, 50],
      clickable: true,
      focusable: true,
      scrollable: false,
      enabled: true,
      children: [],
    };
    const sek = generateSEK(raw, []);
    expect(sek).toBe("key:login_button");
  });

  it("should fallback to resource-id when Flutter Key is absent", () => {
    const raw: RawNode = {
      className: "android.widget.Button",
      resourceId: "com.app:id/btn_submit",
      bounds: [0, 0, 100, 50],
      clickable: true,
      focusable: true,
      scrollable: false,
      enabled: true,
      children: [],
    };
    const sek = generateSEK(raw, []);
    expect(sek).toBe("id:btn_submit");
  });

  it("should generate content-based SEK with screen scope", () => {
    const activityNode: RawNode = {
      className: "com.app.LoginActivity",
      bounds: [0, 0, 1080, 1920],
      clickable: false,
      focusable: false,
      scrollable: false,
      enabled: true,
      children: [],
    };
    const btnNode: RawNode = {
      className: "android.widget.Button",
      text: "Log In",
      bounds: [40, 700, 1040, 800],
      clickable: true,
      focusable: true,
      scrollable: false,
      enabled: true,
      children: [],
    };
    activityNode.children = [btnNode];

    const sek = generateSEK(btnNode, [activityNode]);
    expect(sek).toBe("loginactivity/button:log-in");
  });

  it("should ground a full Android RawNode tree into a TreeSnapshot", () => {
    const root: RawNode = {
      className: "com.app.AuthActivity",
      bounds: [0, 0, 1080, 1920],
      clickable: false,
      focusable: false,
      scrollable: false,
      enabled: true,
      children: [
        {
          className: "android.widget.EditText",
          resourceId: "com.app:id/email",
          text: "user@example.com",
          bounds: [40, 400, 1040, 500],
          clickable: true,
          focusable: true,
          scrollable: false,
          enabled: true,
          children: [],
        },
        {
          className: "android.widget.Button",
          resourceId: "com.app:id/login",
          text: "Log In",
          bounds: [40, 700, 1040, 800],
          clickable: true,
          focusable: true,
          scrollable: false,
          enabled: true,
          children: [],
        },
      ],
    };

    const snapshot = groundAndroidTree(root);
    expect(snapshot.screenScope).toBe("authactivity");
    expect(snapshot.nodes.has("id:email")).toBe(true);
    expect(snapshot.nodes.has("id:login")).toBe(true);
    expect(snapshot.nodes.get("id:login")?.role).toBe("button");
  });
});
