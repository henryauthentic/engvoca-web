"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Calendar, Star, Loader2, Trophy, TrendingUp, Flame, BarChart3 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import {
  getUserStats,
  getWordProgress,
  getUserBadges,
  getStudySessions,
  getStudyTimeHistory,
  getWordsByIds,
  toggleDifficultWord,
} from "@/lib/firestoreService";
import { mapUserStats } from "@/mappers/userMapper";
import { calculateMemoryAccuracy, countByStatus } from "@/mappers/wordProgressMapper";
import { mapBadges, groupBadgesByCategory } from "@/mappers/badgeMapper";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

// Helper: Get YYYY-MM-DD in local time
const getLocalYMD = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// ═══════════════════════════════════════
// Heatmap component (real data using word count)
// ═══════════════════════════════════════
function HeatmapGrid({ wordsPerDay, currentStreak, filter = "6m" }) {

  // Calculate days based on filter
  let totalDays = 180;
  if (filter === '7d') totalDays = 7;
  else if (filter === '30d') totalDays = 30;
  else if (filter === '3m') totalDays = 91;

  const today = new Date();
  const endDate = new Date(today);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - totalDays);
  
  // Align to Sunday for grid layout (except 7d)
  if (filter !== '7d') {
    while (startDate.getDay() !== 0) {
      startDate.setDate(startDate.getDate() - 1);
    }
  }

  const data = [];
  let curr = new Date(startDate);
  while (curr <= endDate) {
    const dateStr = getLocalYMD(curr);
    const count = wordsPerDay[dateStr] || 0;
    
    let level = 0;
    if (count > 0) level = 1;
    if (count >= 10) level = 2;
    if (count >= 20) level = 3;
    if (count >= 30) level = 4;
    
    data.push({ date: dateStr, count: level, actualCount: count });
    curr.setDate(curr.getDate() + 1);
  }

  const colors = ["bg-gray-100", "bg-emerald-200", "bg-emerald-300", "bg-emerald-400", "bg-emerald-500"];

  // For 7d filter, just show a simple row
  if (filter === '7d') {
    const dayLabels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    return (
      <div>
        <div className="flex justify-between gap-2">
          {data.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-md ${colors[day.count]} transition-colors`}
                title={`${day.date}: ${day.actualCount > 0 ? `${day.actualCount} từ` : "Không học"}`}
              />
              <span className="text-[9px] text-gray-400">{dayLabels[new Date(day.date).getDay()]}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-500">
            🔥 Chuỗi hiện tại: <strong className="text-amber-600">{currentStreak} ngày</strong>
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-gray-400">Ít</span>
            {colors.map((c, i) => (
              <div key={i} className={`w-3 h-3 rounded-[2px] ${c}`} />
            ))}
            <span className="text-[9px] text-gray-400">Nhiều</span>
          </div>
        </div>
      </div>
    );
  }

  const weeks = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  const dayLabels = ["", "T2", "", "T4", "", "T6", ""];

  return (
    <div>
      <div className="flex gap-[3px]">
        <div className="flex flex-col gap-[3px] mr-1 pt-0 flex-shrink-0">
          {dayLabels.map((l, i) => (
            <div key={i} className="h-3 flex items-center">
              <span className="text-[9px] text-gray-400 w-3">{l}</span>
            </div>
          ))}
        </div>
        <div className={`flex gap-[3px] flex-1 justify-between pb-1`}>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px] flex-1">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`w-full aspect-square max-w-[14px] rounded-[2px] ${colors[day.count]} transition-colors`}
                  title={`${day.date}: ${day.actualCount > 0 ? `${day.actualCount} từ` : "Không học"}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-gray-500">
          🔥 Chuỗi hiện tại: <strong className="text-amber-600">{currentStreak} ngày</strong>
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-gray-400">Ít</span>
          {colors.map((c, i) => (
            <div key={i} className={`w-3 h-3 rounded-[2px] ${c}`} />
          ))}
          <span className="text-[9px] text-gray-400">Nhiều</span>
        </div>
      </div>
    </div>
  );
}

// Custom tooltip for line chart
function LineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-bold text-violet-600">{payload[0].value} từ</p>
    </div>
  );
}

// ═══════════════════════════════════════
// Profile Page
// ═══════════════════════════════════════
export default function ProfilePage() {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState(null);
  const [savedWords, setSavedWords] = useState([]);
  const [badges, setBadges] = useState([]);
  const [wordsPerDay, setWordsPerDay] = useState({});
  const [xpWeekly, setXpWeekly] = useState([]);
  const [sm2Counts, setSm2Counts] = useState({ newWords: 0, learning: 0, reviewing: 0, mastered: 0 });
  const [lineChartData, setLineChartData] = useState([]);
  const [performance, setPerformance] = useState({ bestDay: "--", bestDayCount: 0, avgPerDay: 0 });
  // Filters (matching mobile app)
  const [heatmapFilter, setHeatmapFilter] = useState("6m");
  const [lineChartFilter, setLineChartFilter] = useState("30d");
  // Raw data for client-side recalculation
  const [allCountsByDate, setAllCountsByDate] = useState({});
  const [storedMapped, setStoredMapped] = useState(null);
  const [storedLearnedByDate, setStoredLearnedByDate] = useState({});
  const [showSavedWordsModal, setShowSavedWordsModal] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!user?.uid) return;
      try {
        const [rawUser, rawProgress, rawBadges, sessions, studyHistory] =
          await Promise.all([
            getUserStats(user.uid),
            getWordProgress(user.uid),
            getUserBadges(user.uid),
            getStudySessions(user.uid, 180),
            getStudyTimeHistory(user.uid, 30),
          ]);

        const memoryAccuracy = calculateMemoryAccuracy(rawProgress);
        const mapped = mapUserStats(rawUser, memoryAccuracy);
        setUserStats(mapped);

        // SM-2 distribution
        setSm2Counts(countByStatus(rawProgress));

        // Deduplicate rawProgress by wordId to prevent over-counting in charts
        const uniqueProgress = [];
        const seenWordIds = new Set();
        for (const p of rawProgress) {
          const id = p.wordId || p.word_id || p.id;
          if (id && !seenWordIds.has(id)) {
            seenWordIds.add(id);
            uniqueProgress.push(p);
          }
        }

        // Difficult/saved words
        const difficultEntries = uniqueProgress
          .filter(p => p.isDifficult === true || p.is_difficult === 1);
        const difficultWordIds = difficultEntries
          .map(p => p.wordId || p.word_id || p.id)
          .filter(Boolean);
        const fullSavedWords = await getWordsByIds(difficultWordIds);
        
        // Fallback: words from API/search won't exist in root `words` collection
        // Build placeholder objects for any missing IDs
        const foundIds = new Set(fullSavedWords.map(w => w.id));
        for (const entry of difficultEntries) {
          const wId = entry.wordId || entry.word_id || entry.id;
          if (wId && !foundIds.has(wId)) {
            fullSavedWords.push({
              id: wId,
              word: entry.word || wId,
              meaning: entry.meaning || "",
              meanings: entry.meanings || [],
              pronunciation: entry.pronunciation || "",
            });
          }
        }
        setSavedWords(fullSavedWords);

        setBadges(mapBadges(rawBadges));



        // === 1. Heatmap/Weekly data: Use dailyWordCounts ===
        let countsByDate = mapped?.dailyWordCounts || {};
        
        if (Object.keys(countsByDate).length === 0 && uniqueProgress.length > 0) {
          for (const p of uniqueProgress) {
            if ((p.status ?? 0) <= 0) continue;
            const raw = p.firstLearnedDate || p.first_learned_date || p.updatedAt || p.syncedAt;
            if (raw && typeof raw === 'string' && raw.length >= 10) {
              const d = raw.substring(0, 10);
              countsByDate[d] = (countsByDate[d] || 0) + 1;
            }
          }
        }
        setWordsPerDay(countsByDate);
        setAllCountsByDate(countsByDate);
        setStoredMapped(mapped);

        // === 2. Line Chart data: Use first_learned_date from uniqueProgress ===
        const learnedByDate = {};
        for (const p of uniqueProgress) {
          if ((p.status ?? 0) <= 0) continue;
          const fld = p.firstLearnedDate || p.first_learned_date;
          if (!fld || typeof fld !== 'string' || fld.length < 10) continue;
          const d = fld.substring(0, 10);
          learnedByDate[d] = (learnedByDate[d] || 0) + 1;
        }
        setStoredLearnedByDate(learnedByDate);
        
        // Weekly Words Learned chart (merge dailyWordCounts + learnedByDate)
        const daysOfWeek = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
        const weekly = [];
        const now = new Date();
        for (let i = -5; i <= 1; i++) {
          const d = new Date(now);
          d.setDate(d.getDate() + i);
          const dStr = getLocalYMD(d);
          const fromCounts = countsByDate[dStr] || 0;
          const fromLearned = learnedByDate[dStr] || 0;
          weekly.push({
            day: daysOfWeek[d.getDay()],
            dateLabel: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
            words: Math.max(fromCounts, fromLearned),
          });
        }
        setXpWeekly(weekly);

        // Build line chart with default 30d filter
        const totalLearnedOverall = mapped?.learnedWords || 0;
        const lineData = buildLineChartData(learnedByDate, 30, totalLearnedOverall);
        setLineChartData(lineData);

        // === 3. Performance stats ===
        const dayNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
        let bestDateStr = "";
        let bestDayCount = 0;
        for (const [dateStr, count] of Object.entries(countsByDate)) {
          if (count > bestDayCount) {
            bestDayCount = count;
            bestDateStr = dateStr;
          }
        }
        
        let bestDay = "--";
        let bestDayDate = "";
        if (bestDateStr) {
          const dParts = bestDateStr.split('-');
          const d = new Date(parseInt(dParts[0]), parseInt(dParts[1]) - 1, parseInt(dParts[2]));
          bestDay = dayNames[d.getDay()];
          bestDayDate = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
        }
        
        const activeDays = Object.values(countsByDate).filter(c => c > 0).length;
        const totalStudied = Object.values(countsByDate).reduce((s, v) => s + v, 0);
        const avgPerDay = activeDays > 0 ? Math.round(totalStudied / activeDays) : 0;
        setPerformance({ bestDay, bestDayDate, bestDayCount, avgPerDay });
      } catch (e) {
        console.error("Lỗi khi tải profile:", e);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  // Helper: Build line chart cumulative data for N days
  function buildLineChartData(learnedByDate, days, totalLearnedOverall) {
    const now = new Date();
    let learnedInPeriod = 0;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      learnedInPeriod += learnedByDate[dateStr] || 0;
    }
    let cumulative = Math.max(0, totalLearnedOverall - learnedInPeriod);
    const lineData = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dateLabel = dateStr.slice(5);
      cumulative += learnedByDate[dateStr] || 0;
      lineData.push({ date: dateLabel, total: cumulative });
    }
    if (lineData.every(d => d.total === 0)) {
      for (let i = 0; i < lineData.length; i++) {
        lineData[i].total = totalLearnedOverall;
      }
    }
    return lineData;
  }

  // Recalculate line chart when filter changes
  useEffect(() => {
    if (!storedMapped) return;
    const days = lineChartFilter === '7d' ? 7 : lineChartFilter === '3m' ? 91 : 30;
    const totalLearnedOverall = storedMapped?.learnedWords || 0;
    setLineChartData(buildLineChartData(storedLearnedByDate, days, totalLearnedOverall));
  }, [lineChartFilter, storedLearnedByDate, storedMapped]);

  if (loading) return <DashboardSkeleton />;

  const displayName = userStats?.displayName || userData?.displayName || user?.displayName || "Bạn";
  const joinDate = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("vi-VN")
    : "Gần đây";
  const badgeGroups = groupBadgesByCategory(badges);
  const maxWords = Math.max(...xpWeekly.map((d) => d.words), 1);

  // SM-2 pie data
  const SM2_COLORS = ["#A78BFA", "#3B82F6", "#F59E0B", "#22C55E"];
  const sm2Data = [
    { name: "Mới", value: sm2Counts.newWords, color: SM2_COLORS[0] },
    { name: "Đang học", value: sm2Counts.learning, color: SM2_COLORS[1] },
    { name: "Ôn tập", value: sm2Counts.reviewing, color: SM2_COLORS[2] },
    { name: "Đã nhớ lâu", value: sm2Counts.mastered, color: SM2_COLORS[3] },
  ];
  const sm2Total = sm2Data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
          👤 <span className="gradient-text">Hồ sơ cá nhân</span>
        </h1>
      </motion.div>

      {/* Profile header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="portal-card p-6 mb-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center text-white text-2xl font-extrabold shadow-xl shadow-primary-500/25">
            {displayName.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-extrabold text-foreground">{displayName}</h2>
            <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-1"><Mail className="w-3.5 h-3.5" /> {user?.email}</p>
            <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5"><Calendar className="w-3.5 h-3.5" /> Tham gia từ {joinDate}</p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-center px-4 py-2 bg-primary-50 rounded-xl">
              <p className="text-lg font-extrabold text-primary-600">{userStats?.cefrLabel ?? "A1"}</p>
              <p className="text-[10px] text-gray-500">{userStats?.cefrName ?? "Sơ cấp"}</p>
            </div>
            <div className="text-center px-4 py-2 bg-amber-50 rounded-xl">
              <p className="text-xl font-extrabold text-amber-600">{(userStats?.totalXp ?? 0).toLocaleString()}</p>
              <p className="text-[10px] text-gray-500">Tổng XP</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: "📚", label: "Từ đã học", value: userStats?.learnedWords ?? 0, color: "bg-blue-50" },
          { icon: "🔥", label: "Streak", value: `${userStats?.currentStreak ?? 0} ngày`, color: "bg-amber-50" },
          { icon: "🧠", label: "Độ nhớ", value: `${Math.round((userStats?.memoryAccuracy ?? 1) * 100)}%`, color: "bg-emerald-50" },
          { icon: "⚡", label: "Tổng XP", value: (userStats?.totalXp ?? 0).toLocaleString(), color: "bg-violet-50" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
            className={`portal-card p-4 text-center ${stat.color}`}>
            <span className="text-2xl">{stat.icon}</span>
            <p className="text-lg font-extrabold text-foreground mt-1">{stat.value}</p>
            <p className="text-[10px] text-gray-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Heatmap */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="portal-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-foreground">📅 Hoạt động học tập</h3>
          <select
            value={heatmapFilter}
            onChange={(e) => setHeatmapFilter(e.target.value)}
            className="text-[11px] font-semibold text-gray-600 bg-gray-100 border-0 rounded-lg px-3 py-1.5 cursor-pointer focus:ring-2 focus:ring-primary-300 outline-none"
          >
            <option value="7d">7 ngày</option>
            <option value="30d">30 ngày</option>
            <option value="3m">3 tháng</option>
            <option value="6m">6 tháng</option>
          </select>
        </div>
        <HeatmapGrid wordsPerDay={wordsPerDay} currentStreak={userStats?.currentStreak ?? 0} filter={heatmapFilter} />
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Line Chart — Tiến trình học tập */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="portal-card p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-foreground">📈 Tiến trình học tập</h3>
            <select
              value={lineChartFilter}
              onChange={(e) => setLineChartFilter(e.target.value)}
              className="text-[11px] font-semibold text-gray-600 bg-gray-100 border-0 rounded-lg px-3 py-1.5 cursor-pointer focus:ring-2 focus:ring-primary-300 outline-none"
            >
              <option value="7d">7 ngày</option>
              <option value="30d">30 ngày</option>
              <option value="3m">3 tháng</option>
            </select>
          </div>
          <p className="text-[11px] text-gray-400 mb-1">Tổng từ đã học</p>
          <p className="text-3xl font-extrabold text-foreground mb-4">
            {userStats?.learnedWords ?? 0} <span className="text-sm font-semibold text-gray-400">từ</span>
          </p>
          <div className="h-48 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={35} />
                <Tooltip content={<LineTooltip />} />
                <Line type="monotone" dataKey="total" stroke="#7C3AED" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#7C3AED', stroke: '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Donut Chart — Phân bổ SM-2 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="portal-card p-5">
          <h3 className="text-sm font-bold text-foreground mb-4">🧠 Phân bổ theo SM-2</h3>
          <div className="flex items-center gap-4">
            <div className="w-40 h-40 flex-shrink-0 min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie data={sm2Data} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {sm2Data.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {sm2Data.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-600 flex-1">{item.name}</span>
                  <span className="text-sm font-bold text-foreground">{item.value}</span>
                  <span className="text-[10px] text-gray-400 w-8 text-right">
                    {sm2Total > 0 ? Math.round((item.value / sm2Total) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Performance Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="portal-card p-5">
          <h3 className="text-sm font-bold text-foreground mb-4">🏆 Hiệu suất học tập</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><Trophy className="w-5 h-5 text-amber-500" /></div>
              <div className="flex-1">
                <p className="text-[11px] text-gray-400">Ngày học nhiều nhất</p>
                <p className="text-sm font-bold text-foreground">{performance.bestDay}{performance.bestDayDate ? ` (${performance.bestDayDate})` : ""}</p>
              </div>
              {performance.bestDayCount > 0 && <span className="text-xs text-emerald-600 font-semibold">+{performance.bestDayCount} từ</span>}
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center"><Flame className="w-5 h-5 text-orange-500" /></div>
              <div className="flex-1">
                <p className="text-[11px] text-gray-400">Chuỗi dài nhất</p>
                <p className="text-sm font-bold text-foreground">{userStats?.longestStreak ?? 0} ngày</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-blue-500" /></div>
              <div className="flex-1">
                <p className="text-[11px] text-gray-400">Trung bình mỗi ngày</p>
                <p className="text-sm font-bold text-foreground">{performance.avgPerDay} từ/ngày</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* XP Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="portal-card p-5">
          <h3 className="text-sm font-bold text-foreground mb-4">📈 Số từ đã học tuần này</h3>
          <div className="flex items-end gap-3 h-40">
            {xpWeekly.map((item, i) => {
              const barHeight = maxWords > 0
                ? Math.max(4, (item.words / maxWords) * 120)
                : 4;
              return (
                <div key={`${item.day}-${item.dateLabel}`} className="flex-1 flex flex-col items-center justify-end h-full">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: barHeight }}
                    transition={{ duration: 0.8, delay: 0.1 * i }}
                    className={`w-full rounded-t-md relative group cursor-pointer ${
                      item.words > 0
                        ? "bg-gradient-to-t from-primary-500 to-secondary-400"
                        : "bg-gray-100"
                    }`}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {item.words} từ
                    </div>
                  </motion.div>
                  <span className="text-[9px] text-gray-400 mt-1">{item.day}</span>
                  <span className="text-[7px] text-gray-300">{item.dateLabel}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* CEFR Level */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="portal-card p-5">
          <h3 className="text-sm font-bold text-foreground mb-3">🎯 Trình độ</h3>
          <div className="text-center mb-3">
            <p className="text-3xl font-extrabold text-primary-600">{userStats?.cefrLabel ?? "A1"}</p>
            <p className="text-sm text-gray-500">{userStats?.cefrName ?? "Sơ cấp"}</p>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${userStats?.cefrProgress ?? 0}%` }}
              transition={{ duration: 1, delay: 0.5 }} className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full" />
          </div>
          <p className="text-[10px] text-gray-400 text-right mt-1">{userStats?.cefrProgress ?? 0}% đến cấp tiếp theo</p>
        </motion.div>
      </div>

      {/* Badges + Saved Words */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="portal-card p-5">
            <h3 className="text-sm font-bold text-foreground mb-4">🏅 Huy hiệu ({badges.filter((b) => b.unlocked).length}/{badges.length})</h3>
            {Object.entries(badgeGroups).map(([category, categoryBadges]) => (
              <div key={category} className="mb-4 last:mb-0">
                <p className="text-xs font-semibold text-gray-500 mb-2">{category}</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {categoryBadges.map((badge) => (
                    <div key={badge.id} className={`text-center p-3 rounded-xl transition-all ${badge.unlocked ? "bg-gradient-to-br from-primary-50 to-secondary-50 border border-primary-100" : "bg-gray-50 border border-gray-200 opacity-40 grayscale"}`} title={badge.description}>
                      <span className="text-3xl block mb-1">{badge.icon}</span>
                      <p className="text-[10px] font-semibold text-foreground leading-tight">{badge.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="portal-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground">⭐ Từ đã lưu</h3>
            {savedWords.length > 0 && (
              <button onClick={() => setShowSavedWordsModal(true)} className="text-[11px] font-bold text-primary-600 hover:text-primary-700 hover:underline transition-all">
                Xem tất cả
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {savedWords.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Chưa có từ vựng nào được lưu.</p>
            ) : (
              savedWords.map((word, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center text-xs font-bold text-primary-600">
                    {(word.word || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate capitalize">{word.word}</p>
                    <p className="text-[10px] text-gray-400 truncate">{word.meanings?.[0] || word.meaning || ""}</p>
                  </div>
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Saved Words Modal */}
      <AnimatePresence>
        {showSavedWordsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSavedWordsModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[85vh] bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--surface)]">
                <h2 className="text-xl font-extrabold text-foreground flex items-center gap-3">
                  <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
                  Từ khó đã lưu ({savedWords.length})
                </h2>
                <button
                  onClick={() => setShowSavedWordsModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--surface-elevated)] border border-[var(--border-color)] hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                {savedWords.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                      <Star className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">Bạn chưa lưu từ vựng nào.</p>
                  </div>
                ) : (
                  savedWords.map((word, i) => {
                    const wId = (word.id || word.word || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    return (
                    <motion.div
                      key={wId || i}
                      layout
                      initial={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -100, height: 0, marginBottom: 0, padding: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] hover:border-primary-500/50 transition-all group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center text-lg font-black text-amber-600 dark:text-amber-500 shadow-inner">
                        {(word.word || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-bold text-foreground truncate capitalize">{word.word}</p>
                          {word.pronunciation && (
                            <span className="text-xs font-semibold text-gray-400 italic">/{word.pronunciation}/</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">{word.meanings?.[0] || word.meaning || ""}</p>
                      </div>
                      <button
                        onClick={async () => {
                          if (!user?.uid) return;
                          try {
                            await toggleDifficultWord(user.uid, wId);
                            setSavedWords(prev => prev.filter(w => (w.id || w.word || '').toLowerCase().replace(/[^a-z0-9]/g, '') !== wId));
                          } catch (e) {
                            console.error('Lỗi bỏ lưu:', e);
                          }
                        }}
                        title="Bỏ lưu"
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"
                      >
                        <Star className="w-5 h-5 fill-current" />
                      </button>
                    </motion.div>);})

                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
