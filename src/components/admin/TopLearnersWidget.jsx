"use client";

import { useState, useEffect } from "react";
import { getTopLearners } from "@/lib/adminService";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const MEDALS = ["🥇", "🥈", "🥉", "4", "5"];

export default function TopLearnersWidget() {
  const [learners, setLearners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getTopLearners(5);
        setLearners(data);
      } catch (err) {
        console.error("Failed to load top learners:", err);
      }
      setLoading(false);
    })();
  }, []);

  const maxXp = learners.length > 0 ? learners[0].totalXp || 1 : 1;

  return (
    <div>
      <h3 className="text-sm font-bold text-foreground mb-1">🏆 All-time Top Learners</h3>
      <p className="text-xs text-gray-400 mb-4">Bảng xếp hạng XP toàn hệ thống</p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : learners.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Chưa có dữ liệu</p>
      ) : (
        <div className="space-y-3">
          {learners.map((user, i) => {
            const pct = Math.max(8, Math.round((user.totalXp / maxXp) * 100));
            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3"
              >
                <span className={`w-7 text-center flex-shrink-0 ${i < 3 ? "text-lg" : "text-xs font-bold text-gray-400"}`}>
                  {MEDALS[i]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-foreground truncate">{user.displayName}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {user.currentStreak > 0 && (
                        <span className="text-[11px] text-orange-500">{user.currentStreak}🔥</span>
                      )}
                      <span className="text-xs font-bold text-foreground font-mono">{user.totalXp.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${i === 0 ? "bg-gradient-to-r from-amber-400 to-yellow-500" : i === 1 ? "bg-gradient-to-r from-gray-300 to-gray-400" : i === 2 ? "bg-gradient-to-r from-orange-300 to-orange-400" : "bg-gradient-to-r from-blue-300 to-blue-400"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
