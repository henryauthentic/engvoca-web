"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";

/**
 * StreakWidget — 3-state streak display:
 * 🔥 Active (orange, glow) — currently on streak
 * 😴 Grace used (faded, no glow) — missed 1 day, grace period active
 * 💀 Broken (gray, fade) — streak was reset
 *
 * @param {{ currentStreak: number, longestStreak: number, usedGracePeriod: boolean, lastStudyDate: string|null }} props
 */
export default function StreakWidget({
  currentStreak = 0,
  longestStreak = 0,
  usedGracePeriod = false,
  lastStudyDate = null,
}) {
  // Determine streak state based on actual date difference
  const streakState = useMemo(() => {
    if (currentStreak === 0) return "broken";
    if (!lastStudyDate) return "broken";

    const now = new Date();
    const last = new Date(lastStudyDate);
    const diffDays = Math.floor(
      (new Date(now.getFullYear(), now.getMonth(), now.getDate()) -
       new Date(last.getFullYear(), last.getMonth(), last.getDate())) / 86400000
    );

    if (diffDays <= 1) return "active";       // Today or yesterday
    if (diffDays === 2 && usedGracePeriod) return "grace"; // Grace: missed 1 day
    return "broken";                           // > 2 days
  }, [currentStreak, usedGracePeriod, lastStudyDate]);

  // Show rolling 7 days: 5 days ago to tomorrow
  const dates = [];
  const now = new Date();
  for (let i = -5; i <= 1; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    dates.push(d);
  }

  const getDayLabel = (d) => {
    const day = d.getDay(); // 0=Sun, 1=Mon
    if (day === 0) return "CN";
    return `T${day + 1}`;
  };

  // Motivational text based on state
  const getMessage = () => {
    switch (streakState) {
      case "grace":
        return { emoji: "😴", text: "Nghỉ 1 ngày — vẫn giữ streak", sub: "Quay lại học hôm nay nhé!" };
      case "broken":
        if (longestStreak > 0) {
          return { emoji: "💀", text: `Chuỗi đã đứt! Kỷ lục: ${longestStreak} ngày`, sub: "Không sao, hãy bắt đầu lại từ hôm nay!" };
        }
        return { emoji: "✨", text: "Chưa có streak nào", sub: "Hãy học ngay để bắt đầu chuỗi!" };
      case "active":
        if (currentStreak >= 30) return { emoji: "🏆", text: "Huyền thoại! Giữ vững phong độ!", sub: null };
        if (currentStreak >= 14) return { emoji: "🔥", text: "Quá đỉnh! Không gì cản nổi!", sub: null };
        if (currentStreak >= 7) return { emoji: "💪", text: "Tuyệt vời! Bạn đang làm rất tốt!", sub: null };
        if (currentStreak >= 3) return { emoji: "🌱", text: "Khởi đầu tốt! Tiếp tục nhé!", sub: null };
        return { emoji: "✨", text: "Ngày đầu tiên! Bắt đầu nào!", sub: null };
      default:
        return { emoji: "✨", text: "Hãy bắt đầu học!", sub: null };
    }
  };

  const message = getMessage();

  // Style config based on state
  const stateConfig = {
    active: {
      fireColor: "text-amber-500",
      fireGlow: "drop-shadow(0 0 12px rgba(245, 158, 11, 0.6))",
      numberColor: "text-amber-500",
      bgGradient: "from-amber-50 to-orange-50",
      dotActive: "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/20",
      scale: 1,
    },
    grace: {
      fireColor: "text-amber-400 opacity-60",
      fireGlow: "none",
      numberColor: "text-amber-400",
      bgGradient: "from-gray-50 to-amber-50/50",
      dotActive: "bg-gradient-to-br from-amber-300 to-amber-400 text-white/80",
      scale: 0.95,
    },
    broken: {
      fireColor: "text-gray-400",
      fireGlow: "none",
      numberColor: "text-gray-400",
      bgGradient: "from-gray-50 to-gray-100",
      dotActive: "bg-gray-300 text-gray-500",
      scale: 0.9,
    },
  };

  const cfg = stateConfig[streakState];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className={`portal-card p-5 bg-gradient-to-br ${cfg.bgGradient}`}
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">🔥 Chuỗi ngày học</h3>

      {/* Main streak display with fire animation */}
      <div className="flex items-center justify-center gap-6 mb-5">
        <div className="text-center">
          {/* Fire icon with state-based animation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={streakState}
              initial={{ scale: 0.5, opacity: 0, filter: "grayscale(100%)" }}
              animate={{
                scale: [cfg.scale, cfg.scale * 1.15, cfg.scale],
                opacity: 1,
                filter: streakState === "broken" ? "grayscale(100%)" : "grayscale(0%)",
              }}
              transition={{
                scale: { duration: 0.6, times: [0, 0.5, 1] },
                opacity: { duration: 0.3 },
                filter: { duration: 0.5 },
              }}
              className="mb-1"
            >
              <span
                className={`text-4xl ${cfg.fireColor}`}
                style={{ filter: cfg.fireGlow }}
              >
                {streakState === "broken" ? "💀" : "🔥"}
              </span>
            </motion.div>
          </AnimatePresence>

          <motion.p
            className={`text-4xl font-extrabold ${cfg.numberColor}`}
            key={currentStreak}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {currentStreak}
          </motion.p>
          <p className="text-[10px] text-gray-400 mt-0.5">Hiện tại</p>
        </div>
        <div className="w-px h-12 bg-gray-200" />
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-400">{longestStreak}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Kỷ lục</p>
        </div>
      </div>

      {/* Week dots */}
      <div className="flex justify-between">
        {dates.map((date, i) => {
          const day = getDayLabel(date);
          const dateStr = date.toISOString().split("T")[0];
          const todayStr = now.toISOString().split("T")[0];

          let isStudied = false;
          let isGrace = false;

          // Check if this date is part of the streak
          if (currentStreak > 0 && lastStudyDate) {
            // Strip time from both dates for accurate comparison
            const targetDate = new Date(dateStr);
            const lastDate = new Date(lastStudyDate);
            targetDate.setHours(0,0,0,0);
            lastDate.setHours(0,0,0,0);
            
            const diffTime = lastDate.getTime() - targetDate.getTime();
            const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
            
            if (diffDays >= 0 && diffDays < currentStreak) {
              isStudied = true;
            } else if (usedGracePeriod && diffDays === -1 && dateStr !== todayStr) {
               isGrace = true;
            }
          }

          // If the date is in the future, it cannot be studied
          const isFuture = dateStr > todayStr;
          if (isFuture) {
            isStudied = false;
            isGrace = false;
          }

          const isToday = dateStr === todayStr;
          const isMissed = !isStudied && !isGrace && !isFuture && !isToday; // Days in the past that weren't studied

          return (
            <div key={dateStr} className="flex flex-col items-center gap-1.5">
              <motion.div
                initial={false}
                animate={{
                  scale: isStudied || isGrace ? 1 : 0.9,
                  opacity: isStudied || isGrace ? 1 : (isMissed ? 0.5 : 0.7),
                }}
                transition={{ duration: 0.3 }}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[14px] font-bold transition-all ${
                  isStudied
                    ? cfg.dotActive
                    : isGrace
                      ? "bg-violet-100 ring-2 ring-violet-300"
                      : isMissed
                        ? "bg-gray-100 ring-1 ring-gray-200 grayscale"
                        : isToday
                          ? "bg-gray-200 text-gray-600 ring-2 ring-amber-300"
                          : "bg-gray-100 text-gray-400"
                }`}
              >
                {isStudied ? "🔥" : isGrace ? "😴" : isMissed ? "🔥" : ""}
              </motion.div>
              <span className={`text-[9px] font-medium ${isToday ? "text-amber-600" : "text-gray-400"}`}>
                {day}
              </span>
            </div>
          );
        })}
      </div>

      {/* Status message with state-based styling */}
      <AnimatePresence mode="wait">
        <motion.div
          key={streakState}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.3 }}
          className={`text-center mt-3 px-3 py-2 rounded-lg ${
            streakState === "active"
              ? "bg-amber-50"
              : streakState === "grace"
                ? "bg-amber-50/50"
                : "bg-gray-50"
          }`}
        >
          <p className={`text-[11px] font-medium ${
            streakState === "active"
              ? "text-amber-700"
              : streakState === "grace"
                ? "text-amber-600/70"
                : "text-gray-500"
          }`}>
            {message.emoji} {message.text}
          </p>
          {message.sub && (
            <p className="text-[9px] text-gray-400 mt-0.5">{message.sub}</p>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
