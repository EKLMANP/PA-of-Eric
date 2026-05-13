import { describe, expect, it } from "vitest";
import { checkProgressFeedback } from "./feedback";
import type { Goal, ProgressLog } from "./types";

const goal: Goal = {
  profileId: "primary",
  currentWeightKg: 80,
  currentBodyFatPct: 22,
  targetWeightKg: 72,
  targetBodyFatPct: 17,
  targetDate: new Date(Date.now() + 12 * 7 * 86_400_000).toISOString(),
  currentPhase: 0,
  phaseWeeks: 4,
};

function log(date: string, weightKg: number): ProgressLog {
  return { date, profileId: "primary", weightKg };
}

describe("checkProgressFeedback", () => {
  it("returns null when fewer than 3 logs", () => {
    expect(checkProgressFeedback([log("2026-01-01", 80), log("2026-01-08", 79.7)], goal, -0.5)).toBeNull();
  });

  it("detects stall and recommends deficit increase", () => {
    // Expected -0.5 kg/week but only losing ~0.1 kg
    const logs = [
      log("2026-01-01", 80),
      log("2026-01-08", 79.9),
      log("2026-01-15", 79.8),
    ];
    const adj = checkProgressFeedback(logs, goal, -0.5);
    expect(adj).not.toBeNull();
    expect(adj!.deltaDailyKcal).toBe(-100);
  });

  it("returns null when progress is on track", () => {
    const logs = [
      log("2026-01-01", 80),
      log("2026-01-08", 79.4),
      log("2026-01-15", 78.9),
    ];
    expect(checkProgressFeedback(logs, goal, -0.5)).toBeNull();
  });
});
