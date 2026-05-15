/**
 * ═══════════════════════════════════════════════════════════
 * MOCK STATS — DEPRECATED
 * ═══════════════════════════════════════════════════════════
 * 
 * Previously used for Dashboard/Profile mock data.
 * Now all data comes from Firestore via mapper layer.
 * 
 * This file is kept temporarily for backward compatibility.
 * TODO: Remove completely once all references are verified.
 */

// DEPRECATED: Was used by DailyGoalWidget (now uses Firestore dailyGoal)
export const DAILY_GOAL = {
  wordsTarget: 15,
  wordsDone: 8,
  reviewTarget: 20,
  reviewDone: 12,
  minutesTarget: 30,
  minutesDone: 18,
};
