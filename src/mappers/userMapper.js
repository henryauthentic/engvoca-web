/**
 * ═══════════════════════════════════════════════════════════
 * USER MAPPER — Raw Firestore → UserStats
 * ═══════════════════════════════════════════════════════════
 * 
 * Mirrors Flutter's LevelService for CEFR calculation.
 * Handles both Firebase field names AND SQLite column names.
 * 
 * IMPORTANT: This is the ONLY place that knows about raw Firestore field names.
 * All UI components receive clean, typed UserStats objects.
 */

// ═══════════════════════════════════════
// CEFR Constants (mirrors LevelService.dart)
// ═══════════════════════════════════════
const CEFR_THRESHOLDS = [
  { maxScore: 100,  label: "A1", name: "Sơ cấp" },
  { maxScore: 500,  label: "A2", name: "Tiền trung cấp" },
  { maxScore: 1500, label: "B1", name: "Trung cấp" },
  { maxScore: 3000, label: "B2", name: "Tiền cao cấp" },
  { maxScore: Infinity, label: "C1", name: "Cao cấp" },
];

/**
 * Calculate CEFR level from effective score.
 * effectiveScore = learnedWords × memoryAccuracy
 * (mirrors LevelService.getLevelId / getLevelLabel / getProgressToNextLevel)
 */
export function calculateCEFR(learnedWords, memoryAccuracy = 1.0) {
  const score = learnedWords * memoryAccuracy;
  
  let prevMax = 0;
  for (const band of CEFR_THRESHOLDS) {
    if (score < band.maxScore) {
      const range = band.maxScore === Infinity ? 3000 : band.maxScore - prevMax;
      const progress = range > 0 ? Math.round(((score - prevMax) / range) * 100) : 100;
      return {
        label: band.label,
        name: band.name,
        progress: Math.min(progress, 100),
        score: Math.round(score),
        nextTarget: band.maxScore === Infinity ? 3000 : band.maxScore,
      };
    }
    prevMax = band.maxScore;
  }

  // Fallback: max level
  return { label: "C1", name: "Cao cấp", progress: 100, score: Math.round(score), nextTarget: 3000 };
}

/**
 * Map raw Firestore user document → UserStats
 * @param {Object} raw - Raw Firestore document data
 * @param {number} [memoryAccuracy=1.0] - Pre-calculated memory accuracy
 * @returns {import('../types/index.js').UserStats|null}
 */
export function mapUserStats(raw, memoryAccuracy = 1.0) {
  if (!raw) return null;

  const totalXp = raw.totalXp ?? raw.total_points ?? 0;
  const level = raw.level ?? 1;
  const learnedWords = raw.learnedWords ?? raw.words_learned ?? 0;
  const learningLevel = raw.learningLevel ?? raw.learning_level ?? "beginner";
  const learningGoal = raw.learningGoal ?? raw.learning_goal ?? "communication";

  // Calculate CEFR from learned words × accuracy (mirrors Mobile LevelService)
  const cefr = calculateCEFR(learnedWords, memoryAccuracy);

  // Parse xpBreakdown (handles both string and object)
  let xpBreakdown = { review: 0, newWords: 0, quiz: 0 };
  const rawXp = raw.xpBreakdown ?? raw.xp_breakdown;
  if (rawXp && typeof rawXp === "object") {
    xpBreakdown = {
      review: rawXp.review ?? 0,
      newWords: rawXp.newWords ?? 0,
      quiz: rawXp.quiz ?? 0,
    };
  }

  // Extract today's dailyStats
  const todayDate = new Date();
  const y = todayDate.getFullYear();
  const m = String(todayDate.getMonth() + 1).padStart(2, '0');
  const d = String(todayDate.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;
  
  const dailyStats = raw.dailyStats || {};
  const todayStats = dailyStats[todayStr] || { reviewed: 0, learned: 0 };
  const reviewedToday = todayStats.reviewed || 0;
  const learnedToday = todayStats.learned || 0;

  return {
    id: raw.id ?? "",
    displayName: raw.displayName ?? raw.name ?? "User",
    email: raw.email ?? "",
    avatar: raw.avatar ?? raw.avatar_url ?? "",
    totalXp,
    currentStreak: raw.currentStreak ?? raw.streak_days ?? 0,
    longestStreak: Math.max(raw.longestStreak ?? raw.longest_streak ?? 0, raw.currentStreak ?? raw.streak_days ?? 0),
    learnedWords,
    totalWords: raw.totalWords ?? 0,
    level,
    learningLevel,
    learningGoal,
    cefrLabel: cefr.label,
    cefrName: cefr.name,
    cefrProgress: cefr.progress,
    dailyGoal: raw.dailyGoal ?? raw.daily_goal ?? 20,
    todayStudyTime: raw.todayStudyTime ?? raw.today_study_time ?? 0,
    lastStudyDate: raw.lastStudyDate ?? raw.last_study_date ?? null,
    memoryAccuracy,
    xpBreakdown,
    isOnboarded: raw.isOnboarded ?? false,
    selectedTopics: raw.selectedTopics ?? raw.selected_topics ?? [],
    // Streak Grace Period
    usedGracePeriod: raw.usedGracePeriod ?? false,
    lastLoginAt: raw.lastLoginAt ?? null,
    dailyWordCounts: raw.dailyWordCounts ?? {},
    reviewedToday,
    learnedToday,
  };
}

/**
 * Map raw Firestore user doc → LeaderboardEntry
 * @param {Object} raw
 * @param {number} rank
 * @param {string} currentUserId
 * @returns {import('../types/index.js').LeaderboardEntry}
 */
export function mapLeaderboardEntry(raw, rank, currentUserId) {
  const learnedWords = raw.learnedWords ?? raw.words_learned ?? 0;
  const cefr = calculateCEFR(learnedWords);
  const name = raw.displayName ?? raw.name ?? "User";

  return {
    rank,
    id: raw.id ?? "",
    name,
    xp: raw.totalXp ?? raw.total_points ?? 0,
    avatar: name.substring(0, 2).toUpperCase(),
    cefrLabel: cefr.label,
    isCurrentUser: raw.id === currentUserId,
  };
}
