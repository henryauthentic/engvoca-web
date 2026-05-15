"use client";

import { motion } from "framer-motion";
import { BookOpen, RefreshCw, Trophy } from "lucide-react";

/**
 * DailyGoalWidget — 2-goal system matching Mobile app.
 * @param {{ learnedToday: number, dailyGoal: number, reviewedToday: number, reviewGoal: number, streak: number }} props
 */
export default function DailyGoalWidget({ 
  learnedToday = 0, 
  dailyGoal = 20, 
  reviewedToday = 0, 
  reviewGoal = 0,
  streak = 0,
  onReviewClick,
  onNewClick
}) {
  const reviewDone = Math.min(reviewedToday, Math.max(reviewGoal, 1));
  const newDone = learnedToday;
  
  const reviewProgress = reviewGoal > 0 ? Math.min((reviewDone / reviewGoal) * 100, 100) : 100;
  const newProgress = dailyGoal > 0 ? Math.min((newDone / dailyGoal) * 100, 100) : 0;
  
  const reviewComplete = reviewGoal === 0 || reviewDone >= reviewGoal;
  const newComplete = newDone >= dailyGoal;
  const allComplete = reviewComplete && newComplete;

  const totalGoal = reviewGoal + dailyGoal;
  const totalDone = reviewDone + newDone;
  const overallPercent = totalGoal > 0 ? Math.round((totalDone / totalGoal) * 100) : 0;

  let motivationText = 'Bắt đầu nào!';
  let motivationEmoji = '✨';
  if (allComplete) {
    motivationText = 'Xuất sắc! Bạn đã hoàn thành tất cả!';
    motivationEmoji = '🎉';
  } else if (reviewComplete && !newComplete) {
    motivationText = 'Đã xong ôn tập! Học thêm từ mới nào!';
    motivationEmoji = '🚀';
  } else if (overallPercent >= 50) {
    motivationText = 'Bạn đang làm rất tốt!';
    motivationEmoji = '🔥';
  } else if (overallPercent > 0) {
    motivationText = 'Tiếp tục phát huy nhé!';
    motivationEmoji = '💪';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className={`portal-card p-5 ${allComplete ? 'bg-gradient-to-br from-emerald-500 to-teal-400 border-none' : 'bg-gradient-to-br from-indigo-50 to-blue-50'}`}
    >
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xl">🎯</span>
        <h3 className={`text-base font-bold ${allComplete ? 'text-white' : 'text-foreground'}`}>
          Mục tiêu hôm nay
        </h3>
      </div>

      <div className="space-y-3 mb-4">
        {/* Ôn tập Goal */}
        <div 
          onClick={onReviewClick}
          className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-colors ${allComplete ? 'bg-white/20 hover:bg-white/30' : 'bg-orange-50 hover:bg-orange-100'}`}
        >
          <div className="relative w-10 h-10 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="12" fill="none" className={allComplete ? "text-white/20" : "text-orange-200"} />
              <motion.circle
                cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="12" fill="none" strokeLinecap="round"
                className={allComplete ? "text-white" : "text-orange-500"}
                initial={{ pathLength: 0 }} animate={{ pathLength: reviewProgress / 100 }} transition={{ duration: 1.5, ease: "easeOut" }}
                strokeDasharray="264" strokeDashoffset={264 - (264 * reviewProgress) / 100}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <RefreshCw className={`w-4 h-4 ${allComplete ? 'text-white' : 'text-orange-600'}`} />
            </div>
          </div>
          <div className="flex-1">
            <p className={`text-sm font-bold ${allComplete ? 'text-white' : 'text-foreground'}`}>Ôn tập</p>
            <p className={`text-[10px] ${allComplete ? 'text-white/80' : 'text-gray-500'}`}>SM-2 Spaced Repetition</p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-extrabold ${allComplete ? 'text-white' : 'text-foreground'}`}>
              {reviewDone}<span className={`text-sm font-medium ${allComplete ? 'text-white/80' : 'text-gray-400'}`}>/{reviewGoal}</span>
            </p>
          </div>
        </div>

        {/* Từ mới Goal */}
        <div 
          onClick={onNewClick}
          className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-colors ${allComplete ? 'bg-white/20 hover:bg-white/30' : 'bg-green-50 hover:bg-green-100'}`}
        >
          <div className="relative w-10 h-10 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="12" fill="none" className={allComplete ? "text-white/20" : "text-green-200"} />
              <motion.circle
                cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="12" fill="none" strokeLinecap="round"
                className={allComplete ? "text-white" : "text-green-500"}
                initial={{ pathLength: 0 }} animate={{ pathLength: newProgress / 100 }} transition={{ duration: 1.5, ease: "easeOut" }}
                strokeDasharray="264" strokeDashoffset={264 - (264 * newProgress) / 100}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen className={`w-4 h-4 ${allComplete ? 'text-white' : 'text-green-600'}`} />
            </div>
          </div>
          <div className="flex-1">
            <p className={`text-sm font-bold ${allComplete ? 'text-white' : 'text-foreground'}`}>Từ mới</p>
            <p className={`text-[10px] ${allComplete ? 'text-white/80' : 'text-gray-500'}`}>Học từ mới mỗi ngày</p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-extrabold ${allComplete ? 'text-white' : 'text-foreground'}`}>
              {newDone}<span className={`text-sm font-medium ${allComplete ? 'text-white/80' : 'text-gray-400'}`}>/{dailyGoal}</span>
            </p>
          </div>
        </div>
      </div>

      <div className={`mt-4 px-4 py-3 rounded-xl ${allComplete ? 'bg-white/20' : 'bg-white/60'} backdrop-blur-sm flex items-center gap-3`}>
        <span className="text-xl">{motivationEmoji}</span>
        <p className={`text-xs font-semibold ${allComplete ? 'text-white' : 'text-foreground'}`}>
          {motivationText}
        </p>
      </div>
    </motion.div>
  );
}
