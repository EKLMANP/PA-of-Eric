import type { AdjustmentRecommendation, Goal, ProgressLog } from "./types";

const ADJUSTMENT_KCAL = 100;
const MIN_PROGRESS_RATIO = 0.5; // actual must be ≥ 50% of expected

/**
 * Return an adjustment recommendation if progress stalls for 2+ consecutive weeks.
 * "Stall" = actual weekly delta < 50% of expected weekly delta for 2 consecutive entries.
 */
export function checkProgressFeedback(
  logs: ProgressLog[],
  goal: Goal,
  expectedWeeklyDeltaKg: number,
): AdjustmentRecommendation | null {
  const profileLogs = logs
    .filter((l) => l.profileId === goal.profileId)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (profileLogs.length < 3) return null; // need at least 3 data points

  // Look at the last 3 entries → 2 consecutive intervals
  const last3 = profileLogs.slice(-3);
  const deltas = [
    last3[1].weightKg - last3[0].weightKg,
    last3[2].weightKg - last3[1].weightKg,
  ];

  const isStalling = deltas.every((d) => {
    if (expectedWeeklyDeltaKg === 0) return false;
    // sign must match, and magnitude must be below threshold
    const sameDirection = Math.sign(d) === Math.sign(expectedWeeklyDeltaKg);
    const insufficientProgress =
      Math.abs(d) < Math.abs(expectedWeeklyDeltaKg) * MIN_PROGRESS_RATIO;
    return !sameDirection || insufficientProgress;
  });

  if (!isStalling) return null;

  const isCut = expectedWeeklyDeltaKg < 0;
  return {
    profileId: goal.profileId,
    deltaDailyKcal: isCut ? -ADJUSTMENT_KCAL : ADJUSTMENT_KCAL,
    reason: isCut
      ? `連續 2 週體重減少不足目標的 50%，建議每天減少 ${ADJUSTMENT_KCAL} kcal（或增加活動量）。`
      : `連續 2 週體重增加不足目標的 50%，建議每天增加 ${ADJUSTMENT_KCAL} kcal 盈餘。`,
  };
}
