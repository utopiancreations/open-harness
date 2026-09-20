import { describe, it, expect } from "vitest";
import { flutterAnalyzeTool } from "../../src/core/tools/flutter_analyze.js";

describe("flutterAnalyzeTool", () => {
  it("executes analyze check cleanly or returns structured error", async () => {
    const res = await flutterAnalyzeTool();
    expect(res).toHaveProperty("ok");
    expect(res).toHaveProperty("summary");
    expect(res).toHaveProperty("systemMessages");
  });
});
