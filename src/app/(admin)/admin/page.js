"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  getDashboardStats,
  saveDailyStats,
  getStreakDistribution,
  getTopTopics,
  getXpDistribution,
  getDailyStatsHistory,
} from "@/lib/adminService";
import StatCard from "@/components/admin/StatCard";
import AuditLogViewer from "@/components/admin/AuditLogViewer";
import RecentUsersWidget from "@/components/admin/RecentUsersWidget";
import TopLearnersWidget from "@/components/admin/TopLearnersWidget";
import { motion } from "framer-motion";
import {
  Users,
  Activity,
  BookOpen,
  Target,
  TrendingUp,
  Zap,
  RefreshCw,
  LayoutDashboard,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
} from "recharts";

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#a855f7", "#ec4899", "#14b8a6", "#f97316"];

function ChartTooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel px-4 py-3 shadow-xl border-white/20 backdrop-blur-xl bg-white/60 dark:bg-slate-900/60">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs text-gray-500 mt-0.5">
          {p.name}: <span className="font-bold text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { userData, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [streakData, setStreakData] = useState([]);
  const [topicsData, setTopicsData] = useState([]);
  const [xpData, setXpData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [statsResult, streaks, topics, xp, history] = await Promise.all([
        getDashboardStats(),
        getStreakDistribution(),
        getTopTopics(),
        getXpDistribution(),
        getDailyStatsHistory(14),
      ]);

      setStats(statsResult);
      setStreakData(streaks);
      setTopicsData(topics);
      setXpData(xp);
      setHistoryData(history);

      // Cache computed stats if they were live-computed
      if (statsResult.source === "live") {
        saveDailyStats(statsResult).catch(() => {});
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    }
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg mb-2"></div>
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
          </div>
          <div className="h-10 w-24 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-panel p-5 h-28 bg-gray-100 dark:bg-gray-800/50"></div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel p-6 h-80 bg-gray-100 dark:bg-gray-800/50"></div>
          <div className="glass-panel p-6 h-80 bg-gray-100 dark:bg-gray-800/50"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Xin chào,{" "}
            <span className="font-semibold text-foreground">
              {userData?.displayName || "Admin"}
            </span>
            . Tổng quan hệ thống hôm nay.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-surface border border-border-color rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Làm mới</span>
        </button>
      </motion.div>

      {/* Stats Row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Tổng Users"
          value={stats?.totalUsers ?? 0}
          icon={Users}
          color="blue"
          delay={0}
        />
        <StatCard
          label="Active hôm nay"
          value={stats?.activeToday ?? 0}
          icon={Activity}
          color="green"
          delay={0.05}
        />
        <StatCard
          label="Tổng từ vựng"
          value={stats?.totalWords ?? 0}
          icon={BookOpen}
          color="purple"
          delay={0.1}
        />
        <StatCard
          label="Tổng đã học"
          value={(stats?.totalLearnedWords ?? 0).toLocaleString()}
          icon={Target}
          color="indigo"
          delay={0.15}
        />
        <StatCard
          label="Retention D1"
          value={`${stats?.retentionD1 ?? 0}%`}
          icon={TrendingUp}
          color="emerald"
          delay={0.2}
        />
        <StatCard
          label="Retention D7"
          value={`${stats?.retentionD7 ?? 0}%`}
          icon={TrendingUp}
          color="orange"
          delay={0.25}
        />
      </div>

      {/* Live Widgets Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="glass-panel hover-lift p-6"
        >
          <RecentUsersWidget />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="glass-panel hover-lift p-6"
        >
          <TopLearnersWidget />
        </motion.div>
      </div>

      {/* Growth Chart Row */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="glass-panel hover-lift p-6"
      >
        <h3 className="text-sm font-bold text-foreground mb-1">📈 Tăng trưởng Từ Vựng Đã Học</h3>
        <p className="text-xs text-gray-400 mb-6">Tổng số lượng từ vựng người dùng đã học qua các ngày</p>
        {historyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--gray-500)" }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fontSize: 12, fill: "var(--gray-500)" }} axisLine={false} tickLine={false} dx={-10} />
              <Tooltip content={<ChartTooltipContent />} cursor={{ stroke: 'var(--border-color)', strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Line type="monotone" dataKey="totalLearnedWords" name="Từ đã học" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="activeToday" name="Active Users" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-60 flex items-center justify-center text-sm text-gray-400">
            Chưa đủ dữ liệu lịch sử
          </div>
        )}
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Streak Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="glass-panel hover-lift p-6"
        >
          <h3 className="text-sm font-bold text-foreground mb-1">🔥 Phân bổ Streak</h3>
          <p className="text-xs text-gray-400 mb-6">Số ngày học liên tục của users</p>
          {streakData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={streakData} barCategoryGap="30%">
                <defs>
                  {CHART_COLORS.map((color, i) => (
                    <linearGradient key={`colorUv${i}`} id={`colorUv${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={1} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.6} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "var(--gray-500)" }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--gray-500)" }}
                  axisLine={false}
                  tickLine={false}
                  dx={-10}
                />
                <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'var(--surface-elevated)', opacity: 0.4 }} />
                <Bar dataKey="value" name="Users" radius={[6, 6, 0, 0]}>
                  {streakData.map((_, i) => (
                    <Cell key={i} fill={`url(#colorUv${i % CHART_COLORS.length})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-sm text-gray-400">
              Chưa có dữ liệu
            </div>
          )}
        </motion.div>

        {/* Top Topics */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, ease: [0.4, 0, 0.2, 1] }}
          className="glass-panel hover-lift p-6"
        >
          <h3 className="text-sm font-bold text-foreground mb-1">📚 Top Chủ đề</h3>
          <p className="text-xs text-gray-400 mb-6">Số lượng từ theo chủ đề chính</p>
          {topicsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topicsData} layout="vertical" barCategoryGap="20%">
                <defs>
                  {CHART_COLORS.map((color, i) => (
                    <linearGradient key={`colorBar${i}`} id={`colorBar${i}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="5%" stopColor={color} stopOpacity={1} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.6} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "var(--gray-500)" }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 11, fill: "var(--gray-500)" }}
                  axisLine={false}
                  tickLine={false}
                  dx={-10}
                />
                <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'var(--surface-elevated)', opacity: 0.4 }} />
                <Bar dataKey="words" name="Từ vựng" radius={[0, 6, 6, 0]}>
                  {topicsData.map((entry, i) => (
                    <Cell key={i} fill={`url(#colorBar${i % CHART_COLORS.length})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-sm text-gray-400">
              Chưa có dữ liệu
            </div>
          )}
        </motion.div>
      </div>

      {/* XP Distribution + Audit Log Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* XP Distribution Pie */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="glass-panel hover-lift p-6"
        >
          <h3 className="text-sm font-bold text-foreground mb-1">⭐ Phân bổ XP</h3>
          <p className="text-xs text-gray-400 mb-6">Phân bố điểm kinh nghiệm của users</p>
          {xpData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie
                    data={xpData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {xpData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {xpData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="text-gray-500 flex-1">{item.name} XP</span>
                    <span className="font-bold text-foreground font-mono">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">
              Chưa có dữ liệu
            </div>
          )}
        </motion.div>

        {/* Audit Log */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, ease: [0.4, 0, 0.2, 1] }}
          className="glass-panel hover-lift p-6"
        >
          <h3 className="text-sm font-bold text-foreground mb-1">🕐 Hoạt động gần đây</h3>
          <p className="text-xs text-gray-400 mb-4">Lịch sử hành động admin</p>
          <div className="max-h-[260px] overflow-y-auto">
            <AuditLogViewer maxItems={10} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
