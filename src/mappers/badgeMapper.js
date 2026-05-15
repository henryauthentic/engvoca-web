/**
 * ═══════════════════════════════════════════════════════════
 * BADGE MAPPER — Merge definitions + Firestore unlocked data
 * ═══════════════════════════════════════════════════════════
 * 
 * All badge definitions are mirrored from Flutter's badge.dart.
 * Firestore only stores { badge_id, unlocked_at } for unlocked badges.
 * This mapper merges them for complete display.
 */

/**
 * Complete badge definitions — mirrors Badge.allBadges in badge.dart
 */
export const ALL_BADGES = [
  // 📚 VOCABULARY
  { id: "first_word", name: "Bước đầu tiên", icon: "🐣", description: "Học từ vựng đầu tiên", category: "vocabulary", targetValue: 1 },
  { id: "word_10", name: "Nhà sưu tập", icon: "📚", description: "Học được 10 từ vựng", category: "vocabulary", targetValue: 10 },
  { id: "word_50", name: "Thánh từ vựng", icon: "🏆", description: "Học được 50 từ vựng", category: "vocabulary", targetValue: 50 },
  { id: "word_100", name: "Bậc thầy ngôn ngữ", icon: "🎓", description: "Học được 100 từ vựng", category: "vocabulary", targetValue: 100 },
  { id: "word_200", name: "Kho từ vựng", icon: "📖", description: "Học được 200 từ vựng", category: "vocabulary", targetValue: 200 },
  { id: "word_500", name: "Bách khoa toàn thư", icon: "🌟", description: "Học được 500 từ vựng", category: "vocabulary", targetValue: 500 },
  { id: "word_1000", name: "Bậc thầy 1000 từ", icon: "👑", description: "Học được 1000 từ vựng", category: "vocabulary", targetValue: 1000 },

  // 🔥 STREAK
  { id: "streak_3", name: "Kiên trì 3 ngày", icon: "🔥", description: "Duy trì chuỗi học 3 ngày liên tiếp", category: "streak", targetValue: 3 },
  { id: "streak_7", name: "Chuỗi 7 ngày", icon: "💪", description: "Duy trì chuỗi học 7 ngày liên tiếp", category: "streak", targetValue: 7 },
  { id: "streak_14", name: "Chiến binh 2 tuần", icon: "🛡️", description: "Duy trì chuỗi học 14 ngày liên tiếp", category: "streak", targetValue: 14 },
  { id: "streak_30", name: "Chiến binh 30 ngày", icon: "⚔️", description: "Duy trì chuỗi học 30 ngày liên tiếp", category: "streak", targetValue: 30 },
  { id: "streak_60", name: "Huyền thoại 60 ngày", icon: "🏰", description: "Duy trì chuỗi học 60 ngày liên tiếp", category: "streak", targetValue: 60 },
  { id: "streak_100", name: "Bất khả chiến bại", icon: "🐉", description: "Duy trì chuỗi học 100 ngày liên tiếp", category: "streak", targetValue: 100 },

  // ⚡ SPECIAL
  { id: "night_owl", name: "Cú đêm", icon: "🦉", description: "Học bài lúc 0h - 4h sáng", category: "special", targetValue: 1 },
  { id: "early_bird", name: "Chim sớm", icon: "🐦", description: "Học bài lúc 5h - 7h sáng", category: "special", targetValue: 1 },
  { id: "speed_demon", name: "Tốc độ ánh sáng", icon: "⚡", description: "Hoàn thành quiz dưới 30 giây", category: "special", targetValue: 1 },

  // 🏅 ACHIEVEMENT
  { id: "perfect_score", name: "Hoàn hảo", icon: "💯", description: "Đạt 100% trong bài quiz (≥10 câu)", category: "achievement", targetValue: 1 },
  { id: "story_lover", name: "Mọt truyện", icon: "📖", description: "Tạo 5 truyện AI", category: "achievement", targetValue: 5 },
  { id: "chat_master", name: "Bậc thầy hội thoại", icon: "💬", description: "Chat 10 cuộc hội thoại AI", category: "achievement", targetValue: 10 },
  { id: "xp_500", name: "Tích lũy 500 XP", icon: "⭐", description: "Đạt tổng cộng 500 điểm kinh nghiệm", category: "achievement", targetValue: 500 },
  { id: "xp_1000", name: "Ngôi sao 1000 XP", icon: "🌟", description: "Đạt tổng cộng 1000 điểm kinh nghiệm", category: "achievement", targetValue: 1000 },
  { id: "xp_5000", name: "Siêu sao 5000 XP", icon: "💎", description: "Đạt tổng cộng 5000 điểm kinh nghiệm", category: "achievement", targetValue: 5000 },
  { id: "quiz_10", name: "Nhà giao tập", icon: "📝", description: "Hoàn thành 10 bài quiz", category: "achievement", targetValue: 10 },
  { id: "quiz_50", name: "Vua trắc nghiệm", icon: "🎯", description: "Hoàn thành 50 bài quiz", category: "achievement", targetValue: 50 },
];

/**
 * Merge badge definitions with unlocked data from Firestore.
 * Firestore stores: { badge_id: string, unlocked_at: string }
 * 
 * @param {Object[]} unlockedDocs - Raw Firestore badge documents
 * @returns {import('../types/index.js').Badge[]}
 */
export function mapBadges(unlockedDocs = []) {
  const unlockedMap = new Map();
  for (const doc of unlockedDocs) {
    const id = doc.badge_id ?? doc.badgeId ?? doc.id;
    const at = doc.unlocked_at ?? doc.unlockedAt ?? null;
    if (id) unlockedMap.set(id, at);
  }

  return ALL_BADGES.map((def) => ({
    id: def.id,
    name: def.name,
    icon: def.icon,
    description: def.description,
    category: def.category,
    targetValue: def.targetValue,
    unlocked: unlockedMap.has(def.id),
    unlockedAt: unlockedMap.get(def.id) ?? null,
  }));
}

/**
 * Group badges by category for display
 * @param {import('../types/index.js').Badge[]} badges
 * @returns {Object.<string, import('../types/index.js').Badge[]>}
 */
export function groupBadgesByCategory(badges) {
  const groups = {};
  const categoryLabels = {
    vocabulary: "📚 Từ vựng",
    streak: "🔥 Chuỗi ngày",
    special: "⚡ Đặc biệt",
    achievement: "🏅 Thành tích",
  };

  for (const badge of badges) {
    const key = categoryLabels[badge.category] || badge.category;
    if (!groups[key]) groups[key] = [];
    groups[key].push(badge);
  }
  return groups;
}
