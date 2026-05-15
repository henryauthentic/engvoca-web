"use client";

import { motion } from "framer-motion";

const RANK_COLORS = [
  "from-amber-400 to-yellow-500",    // 1st
  "from-gray-300 to-gray-400",       // 2nd
  "from-orange-400 to-amber-500",    // 3rd
  "from-primary-400 to-primary-500", // 4th+
];

/**
 * Real leaderboard widget using mapped LeaderboardEntry data.
 * @param {{ entries: import('@/types/index.js').LeaderboardEntry[] }} props
 */
export default function LeaderboardWidget({ entries = [] }) {
  if (entries.length === 0) {
    return (
      <div className="portal-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">🏆 Bảng xếp hạng</h3>
        <p className="text-xs text-gray-400 text-center py-4">Chưa có dữ liệu.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="portal-card p-5"
    >
      <h3 className="text-sm font-semibold text-foreground mb-3">🏆 Bảng xếp hạng</h3>
      <div className="space-y-2.5">
        {entries.map((entry) => {
          const colorIdx = Math.min(entry.rank - 1, RANK_COLORS.length - 1);
          const avatarGradient = RANK_COLORS[colorIdx];

          return (
            <div
              key={entry.id || entry.rank}
              className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                entry.isCurrentUser
                  ? "bg-primary-50 border border-primary-200"
                  : "hover:bg-gray-50"
              }`}
            >
              <span className="text-sm font-bold w-5 text-center text-gray-400">
                {entry.rank === 1
                  ? "🥇"
                  : entry.rank === 2
                    ? "🥈"
                    : entry.rank === 3
                      ? "🥉"
                      : entry.rank}
              </span>
              <div
                className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white text-xs font-bold`}
              >
                {entry.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    entry.isCurrentUser ? "text-primary-700" : "text-foreground"
                  }`}
                >
                  {entry.name} {entry.isCurrentUser && "(Bạn)"}
                </p>
                <p className="text-[10px] text-gray-400">{entry.cefrLabel}</p>
              </div>
              <span className="text-xs font-semibold text-gray-500">
                {entry.xp.toLocaleString()} XP
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
