import { describe, it, expect } from "vitest";
import { MilestoneController, parseMilestonesFromPlan } from "../../src/core/harness/milestone_controller.js";

describe("MilestoneController", () => {
  it("should parse milestone headers and checkbox tasks from plan markdown", () => {
    const planMd = `
# Master Plan Execution

### Milestone 1: Geolocation & Distance Filtering Engine
- [ ] Implement Geolocator service
- [ ] Implement Haversine distance sorting algorithm

### Milestone 2: Profiles & Media Uploads
- [ ] Image picker integration
- [ ] Cloud storage upload service
`;

    const milestones = parseMilestonesFromPlan(planMd);
    expect(milestones.length).toBe(2);
    expect(milestones[0].title).toContain("Milestone 1");
    expect(milestones[0].tasks.length).toBe(2);
    expect(milestones[1].title).toContain("Milestone 2");

    const ctrl = new MilestoneController(planMd);
    expect(ctrl.getTotalCount()).toBe(2);
    expect(ctrl.getActiveMilestone()?.id).toBe(1);

    ctrl.markActiveComplete();
    expect(ctrl.getActiveMilestone()?.id).toBe(2);

    ctrl.markActiveComplete();
    expect(ctrl.isAllCompleted()).toBe(true);
  });
});
