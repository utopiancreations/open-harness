import { describe, it, expect } from "vitest";
import { ActionHistory } from "../../src/core/grounding/loop_detector.js";

describe("ActionHistory Loop Detector", () => {
  it("should detect DEAD_ELEMENT_STUCK after 3 consecutive NO_CHANGE on same target", () => {
    const history = new ActionHistory();
    history.record("auth_screen/button:log-in", "ui_tap", "NO_CHANGE");
    history.record("auth_screen/button:log-in", "ui_tap", "NO_CHANGE");
    history.record("auth_screen/button:log-in", "ui_tap", "NO_CHANGE");

    const signal = history.detectLoop();
    expect(signal).not.toBeNull();
    expect(signal!.type).toBe("DEAD_ELEMENT_STUCK");
    expect(signal!.sek).toBe("auth_screen/button:log-in");
    expect(signal!.message).toContain("Loop detected");
  });

  it("should detect NAVIGATION_CYCLE after A-B-A-B pattern", () => {
    const history = new ActionHistory();
    history.record("screen_a/button:next", "ui_tap", "NAVIGATED");
    history.record("screen_b/button:back", "ui_tap", "NAVIGATED");
    history.record("screen_a/button:next", "ui_tap", "NAVIGATED");
    history.record("screen_b/button:back", "ui_tap", "NAVIGATED");

    const signal = history.detectLoop();
    expect(signal).not.toBeNull();
    expect(signal!.type).toBe("NAVIGATION_CYCLE");
    expect(signal!.message).toContain("Navigation cycle");
  });

  it("should return null when no loop pattern is detected", () => {
    const history = new ActionHistory();
    history.record("auth_screen/text_input:email", "ui_tap", "MUTATED");
    history.record("auth_screen/text_input:email", "ui_type", "MUTATED");
    history.record("auth_screen/button:log-in", "ui_tap", "NAVIGATED");

    const signal = history.detectLoop();
    expect(signal).toBeNull();
  });
});
