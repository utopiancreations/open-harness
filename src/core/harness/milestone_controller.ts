import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface HarnessMilestone {
  id: number;
  title: string;
  tasks: string[];
  completed: boolean;
}

export function parseMilestonesFromPlan(markdown: string): HarnessMilestone[] {
  const milestones: HarnessMilestone[] = [];
  const lines = markdown.split("\n");
  let currentMilestone: HarnessMilestone | null = null;
  let milestoneCounter = 1;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("### Milestone") || trimmed.startsWith("## Milestone") || trimmed.startsWith("### Epic")) {
      if (currentMilestone) {
        milestones.push(currentMilestone);
      }
      currentMilestone = {
        id: milestoneCounter++,
        title: trimmed.replace(/^[#\s]+/, ""),
        tasks: [],
        completed: false,
      };
    } else if (currentMilestone && (trimmed.startsWith("- [ ]") || trimmed.startsWith("- [x]"))) {
      currentMilestone.tasks.push(trimmed.replace(/^-\s*\[[ xX]\]\s*/, ""));
    }
  }

  if (currentMilestone) {
    milestones.push(currentMilestone);
  }

  // Fallback default milestones if no explicit milestone headings were generated
  if (milestones.length === 0) {
    milestones.push(
      {
        id: 1,
        title: "Milestone 1: Core Data Models & State Architecture",
        tasks: ["Define models and state management"],
        completed: false,
      },
      {
        id: 2,
        title: "Milestone 2: Services, Cryptography & Backend Storage",
        tasks: ["Implement services and backend integrations"],
        completed: false,
      },
      {
        id: 3,
        title: "Milestone 3: UI Screens & Navigation Flows",
        tasks: ["Build screens and route navigation"],
        completed: false,
      },
      {
        id: 4,
        title: "Milestone 4: Verification, Unit Testing & QA Polish",
        tasks: ["Verify build and write tests"],
        completed: false,
      }
    );
  }

  return milestones;
}

export class MilestoneController {
  private milestones: HarnessMilestone[] = [];
  private activeIndex = 0;

  constructor(planMarkdown?: string) {
    if (planMarkdown) {
      this.milestones = parseMilestonesFromPlan(planMarkdown);
    }
  }

  getMilestones(): HarnessMilestone[] {
    return this.milestones;
  }

  getActiveMilestone(): HarnessMilestone | null {
    if (this.activeIndex < this.milestones.length) {
      return this.milestones[this.activeIndex];
    }
    return null;
  }

  getActiveIndex(): number {
    return this.activeIndex;
  }

  getTotalCount(): number {
    return this.milestones.length;
  }

  markActiveComplete(): boolean {
    if (this.activeIndex < this.milestones.length) {
      this.milestones[this.activeIndex].completed = true;
      this.activeIndex++;
      return true;
    }
    return false;
  }

  isAllCompleted(): boolean {
    return this.activeIndex >= this.milestones.length;
  }
}
