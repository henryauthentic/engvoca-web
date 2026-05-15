"use client";

import { useState, useEffect } from "react";
import { getRecentActiveUsers } from "@/lib/adminService";
import { motion } from "framer-motion";
import { Globe, Smartphone, Loader2 } from "lucide-react";

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const now = new Date();
  const d = new Date(dateStr + "T00:00:00");
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return "Hôm nay";
  if (diffDays === 1) return "Hôm qua";
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return dateStr;
}

const AVATAR_COLORS = [
  "from-blue-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-purple-400 to-pink-500",
  "from-orange-400 to-red-500",
  "from-cyan-400 to-blue-500",
];

export default function RecentUsersWidget() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getRecentActiveUsers(5);
        setUsers(data);
      } catch (err) {
        console.error("Failed to load recent users:", err);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h3 className="text-sm font-bold text-foreground mb-1">👥 Hoạt động gần đây</h3>
      <p className="text-xs text-gray-400 mb-4">Users học gần nhất</p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Chưa có dữ liệu</p>
      ) : (
        <div className="space-y-2.5">
          {users.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                {(user.displayName || "U").substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{user.displayName}</p>
                <p className="text-[11px] text-gray-400">{timeAgo(user.lastStudyDate)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-bold text-foreground font-mono">{(user.totalXp || 0).toLocaleString()} XP</span>
                {user.lastChangeSource === "web"
                  ? <Globe className="w-3.5 h-3.5 text-blue-400" />
                  : <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                }
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
