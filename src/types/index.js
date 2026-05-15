/**
 * ═══════════════════════════════════════════════════════════
 * DATA CONTRACT — Shared schema between Mobile (Flutter) & Web (Next.js)
 * ═══════════════════════════════════════════════════════════
 * 
 * This file defines the canonical data shapes used across the app.
 * All UI components must consume ONLY these types (via mappers).
 * Raw Firestore data must NEVER be used directly in components.
 */

/**
 * @typedef {Object} UserStats
 * @property {string} id
 * @property {string} displayName
 * @property {string} email
 * @property {string} avatar
 * @property {number} totalXp
 * @property {number} currentStreak
 * @property {number} longestStreak
 * @property {number} learnedWords
 * @property {number} totalWords
 * @property {number} level - Numeric level (1–100)
 * @property {string} learningLevel - Raw level key: "beginner"|"elementary"|"intermediate"|"upper_intermediate"|"advanced"
 * @property {string} cefrLabel - Display label: "A1", "A2", "B1", "B2", "C1"
 * @property {string} cefrName - Vietnamese name: "Sơ cấp", "Tiền trung cấp"...
 * @property {number} cefrProgress - Progress within current CEFR band (0–100)
 * @property {number} dailyGoal - Word-count based daily goal
 * @property {number} todayStudyTime - Seconds studied today
 * @property {string|null} lastStudyDate - "YYYY-MM-DD"
 * @property {number} memoryAccuracy - 0.0 to 1.0
 * @property {{ review: number, newWords: number, quiz: number }} xpBreakdown
 * @property {boolean} isOnboarded
 * @property {string[]} selectedTopics
 */

/**
 * @typedef {Object} WordProgress
 * @property {string} wordId
 * @property {number} status - 0=New, 1=Learning, 2=Reviewing, 3=Mastered
 * @property {number} intervalDays
 * @property {number} easinessFactor
 * @property {number} repetition
 * @property {number} reviewCount
 * @property {number} lapses
 * @property {number} wrongCount
 * @property {boolean} isDifficult
 * @property {string|null} nextReviewDate - ISO string
 * @property {string|null} lastReviewDate - ISO string
 */

/**
 * @typedef {Object} Badge
 * @property {string} id
 * @property {string} name
 * @property {string} icon - emoji
 * @property {string} description
 * @property {string} category - "vocabulary"|"streak"|"special"|"achievement"
 * @property {number} targetValue
 * @property {boolean} unlocked
 * @property {string|null} unlockedAt - ISO string
 */

/**
 * @typedef {Object} LeaderboardEntry
 * @property {number} rank
 * @property {string} id
 * @property {string} name
 * @property {number} xp
 * @property {string} avatar
 * @property {string} cefrLabel
 * @property {boolean} isCurrentUser
 */

/**
 * @typedef {Object} HeatmapDay
 * @property {string} date - "YYYY-MM-DD"
 * @property {number} count - activity level 0–4
 * @property {number} seconds - study time in seconds
 */

// Export empty object to make this a module
export {};
