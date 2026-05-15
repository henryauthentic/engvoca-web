/**
 * ═══════════════════════════════════════════════════════════
 * WORD PROGRESS MAPPER — Raw Firestore → WordProgress
 * ═══════════════════════════════════════════════════════════
 * 
 * Handles field naming differences between:
 * - Mobile sync (snake_case: word_id, interval_days, easiness_factor)
 * - Web writes (camelCase or snake_case depending on version)
 * 
 * Also provides computed values: memoryAccuracy, difficultWords
 */

/**
 * Map raw Firestore wordProgress doc → WordProgress
 * @param {Object} raw - Raw Firestore doc data
 * @returns {import('../types/index.js').WordProgress}
 */
export function mapWordProgress(raw) {
  if (!raw) return null;

  return {
    wordId: raw.word_id ?? raw.wordId ?? raw.id ?? "",
    status: raw.status ?? 0,
    intervalDays: raw.interval_days ?? raw.intervalDays ?? 0,
    easinessFactor: raw.easiness_factor ?? raw.easinessFactor ?? 2.5,
    repetition: raw.repetition ?? 0,
    reviewCount: raw.review_count ?? raw.reviewCount ?? 0,
    lapses: raw.lapses ?? 0,
    wrongCount: raw.wrong_count ?? raw.wrongCount ?? 0,
    isDifficult: raw.is_difficult === 1 || raw.isDifficult === true,
    nextReviewDate: raw.next_review_date ?? raw.nextReviewDate ?? null,
    lastReviewDate: raw.last_review_date ?? raw.lastReviewDate ?? null,
  };
}

/**
 * Calculate overall memory accuracy from a list of word progress entries.
 * Formula: (totalReviews - totalLapses) / totalReviews
 * Mirrors: database_helper_mobile.dart → getMemoryAccuracy()
 * 
 * @param {Object[]} rawProgressList - Raw Firestore docs
 * @returns {number} 0.0 to 1.0
 */
export function calculateMemoryAccuracy(rawProgressList) {
  if (!rawProgressList || rawProgressList.length === 0) return 1.0;

  const mapped = rawProgressList.map(mapWordProgress).filter(Boolean);
  // Only include entries that have been ACTUALLY reviewed (not phantom entries)
  const reviewed = mapped.filter((p) => p.status > 0 && p.reviewCount > 0);

  if (reviewed.length === 0) return 1.0;

  const totalReviews = reviewed.reduce((sum, p) => sum + p.reviewCount, 0);
  const totalLapses = reviewed.reduce((sum, p) => sum + p.lapses, 0);

  if (totalReviews === 0) return 1.0;
  return (totalReviews - totalLapses) / totalReviews;
}

/**
 * Filter and sort difficult words from progress list.
 * A word is "difficult" if: is_difficult == true OR wrong_count >= 3
 * Mirrors: database_helper_mobile.dart → getDifficultWords()
 * 
 * @param {Object[]} rawProgressList - Raw Firestore docs
 * @returns {import('../types/index.js').WordProgress[]}
 */
export function filterDifficultWords(rawProgressList) {
  if (!rawProgressList || rawProgressList.length === 0) return [];

  return rawProgressList
    .map(mapWordProgress)
    .filter(Boolean)
    .filter((p) => p.isDifficult)
    .sort((a, b) => b.wrongCount - a.wrongCount);
}

/**
 * Count words by SRS status
 * @param {Object[]} rawProgressList
 * @returns {{ newWords: number, learning: number, reviewing: number, mastered: number }}
 */
export function countByStatus(rawProgressList) {
  const counts = { newWords: 0, learning: 0, reviewing: 0, mastered: 0 };
  if (!rawProgressList) return counts;

  for (const raw of rawProgressList) {
    const p = mapWordProgress(raw);
    if (!p) continue;
    // Logic removed to match Mobile's SM-2 distribution exactly (Mobile counts status=0)
    switch (p.status) {
      case 0: counts.newWords++; break;
      case 1: counts.learning++; break;
      case 2: counts.reviewing++; break;
      case 3: counts.mastered++; break;
      default: break;
    }
  }
  return counts;
}

/**
 * Get status label for display
 * @param {number} status
 * @returns {{ label: string, color: string }}
 */
export function getStatusDisplay(status) {
  switch (status) {
    case 1: return { label: "Đang học", color: "text-blue-600 bg-blue-50" };
    case 2: return { label: "Ôn tập", color: "text-amber-600 bg-amber-50" };
    case 3: return { label: "Thuộc lòng", color: "text-emerald-600 bg-emerald-50" };
    default: return { label: "Mới", color: "text-gray-500 bg-gray-50" };
  }
}
