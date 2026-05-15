"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  ArrowRight,
  BookOpen,
  Headphones,
  TrendingUp,
  Trophy,
  Brain,
  AlertTriangle,
} from "lucide-react";
import StatsCard from "@/components/portal/StatsCard";
import DailyGoalWidget from "@/components/portal/DailyGoalWidget";
import StreakWidget from "@/components/portal/StreakWidget";
import LeaderboardWidget from "@/components/portal/LeaderboardWidget";
import DifficultWordsWidget from "@/components/portal/DifficultWordsWidget";
import ReviewListModal from "@/components/portal/ReviewListModal";
import { useAuth } from "@/lib/AuthContext";
import {
  getUserStats,
  getWordsToReviewToday,
  getTopicsWithProgress,
  getLeaderboard,
  validateAndUpdateStreak,
} from "@/lib/firestoreService";
import { mapUserStats, mapLeaderboardEntry } from "@/mappers/userMapper";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { getRandomWord } from "@/data/mockWords";
import { ARTICLES } from "@/data/mockArticles";

export default function DashboardPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [randomWord] = useState(() => getRandomWord());
  const [showAllTopics, setShowAllTopics] = useState(false);

  // Real data state
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState(null);
  const [wordsToReview, setWordsToReview] = useState(0);
  const [difficultWordsCount, setDifficultWordsCount] = useState(0);
  const [learnedToday, setLearnedToday] = useState(0);
  const [reviewedToday, setReviewedToday] = useState(0);
  const [reviewWordsList, setReviewWordsList] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const [studyStats, setStudyStats] = useState({
    studyMinutesToday: 0,
    goalMinutes: 10,
    weeklyChart: [],
  });
  const [topics, setTopics] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  const displayName = userStats?.displayName || userData?.displayName || user?.displayName || "Bạn";

  useEffect(() => {
    async function loadRealData() {
      if (!user?.uid) return;
      try {
        // ✅ Validate streak first (breaks stale streaks on Firestore before we read)
        await validateAndUpdateStreak(user.uid);

        // ✅ ADVANCED QUERY: No more getWordProgress() full-collection load
        // Topics progress comes from userStats.topicProgress (denormalized)
        // Memory accuracy comes from userStats.totalReviews/totalLapses
        const [rawUser, reviewWords, topicsData, rawLeaderboard, allProgress] =
          await Promise.all([
            getUserStats(user.uid),
            getWordsToReviewToday(user.uid),
            getTopicsWithProgress(user.uid),
            getLeaderboard(10),
            import("@/lib/firestoreService").then(m => m.getWordProgress(user.uid))
          ]);

        setTopics(topicsData);
        setWordsToReview(reviewWords.length);
        setReviewWordsList(reviewWords);

        // ✅ Memory accuracy from denormalized stats (0 extra Reads)
        const totalReviews = rawUser?.totalReviews || 0;
        const totalLapses = rawUser?.totalLapses || 0;
        const memoryAccuracy = totalReviews > 0
          ? (totalReviews - totalLapses) / totalReviews
          : 1.0;

        // Difficult words: count from reviewWords that are marked difficult
        const difficultFromReview = reviewWords.filter(
          (w) => w.isDifficult === true || w.is_difficult === true
        );
        setDifficultWordsCount(difficultFromReview.length);

        // Helpers to avoid duplicate definitions
        const getLocalYMD = (date) => {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        };

        const getLocalYMDFromISO = (isoString) => {
          if (!isoString) return '';
          if (isoString.seconds) {
            return getLocalYMD(new Date(isoString.seconds * 1000));
          }
          const d = new Date(isoString);
          if (isNaN(d.getTime())) return isoString;
          return getLocalYMD(d);
        };

        // Map user through mapper layer
        const mapped = mapUserStats(rawUser, memoryAccuracy);
        setUserStats(mapped);

        // ✅ COMPUTE PROGRESS DIRECTLY FROM WORD PROGRESS (Matches Mobile 100%)
        const todayStr = getLocalYMD(new Date());
        let computedReviewed = 0;
        let computedLearned = 0;

        allProgress.forEach(w => {
          const lrd = w.lastReviewDate || w.last_review_date;
          const fld = w.firstLearnedDate || w.first_learned_date;
          
          const reviewDateStr = getLocalYMDFromISO(lrd);
          const learnedDateStr = getLocalYMDFromISO(fld);

          if (learnedDateStr === todayStr) {
            computedLearned++;
          }
          if (reviewDateStr === todayStr && learnedDateStr !== todayStr) {
            computedReviewed++;
          }
        });
        
        setLearnedToday(computedLearned);
        setReviewedToday(computedReviewed);

        // Map leaderboard
        const mappedLeaderboard = rawLeaderboard.map((raw, i) =>
          mapLeaderboardEntry(raw, i + 1, user.uid)
        );
        setLeaderboard(mappedLeaderboard);

        // Weekly chart logic: rolling 7 days (-5 to +1)
        const weekly = [];
        const wordsByDay = mapped?.dailyWordCounts || {};
        
        const getDayLabel = (d) => {
          const day = d.getDay(); // 0=Sun, 1=Mon
          if (day === 0) return "CN";
          return `T${day + 1}`;
        };

        const now = new Date();
        for (let i = -5; i <= 1; i++) {
          const d = new Date(now);
          d.setDate(now.getDate() + i);
          const dateStr = getLocalYMD(d);
          const count = wordsByDay[dateStr] || 0;
          
          weekly.push({
            day: getDayLabel(d),
            dateLabel: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
            count: count,
          });
        }
        
        const maxCount = Math.max(...weekly.map(d => d.count), 5);

        setStudyStats({
          weeklyChart: weekly,
          maxCount: maxCount,
        });
      } catch (error) {
        console.error("Lỗi khi load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadRealData();
  }, [user]);

  const handleHeroSearch = () => {
    if (searchQuery.trim()) {
      router.push(
        `/dictionary?q=${encodeURIComponent(searchQuery.trim().toLowerCase())}`
      );
    }
  };

  if (loading) return <DashboardSkeleton />;

  const maxCount = Math.max(
    ...studyStats.weeklyChart.map((d) => d.count),
    5
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden p-8 md:p-12 bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 animate-gradient"
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-5 left-10 w-32 h-32 bg-white/5 rounded-full blur-xl" />
          <div className="absolute bottom-5 right-10 w-48 h-48 bg-white/5 rounded-full blur-xl" />
        </div>
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
            Xin chào, {displayName}! 👋
          </h1>
          <p className="text-white/70 text-sm md:text-base mb-6">
            Hôm nay bạn có{" "}
            <strong className="text-white bg-white/20 px-2 py-0.5 rounded-md">
              {wordsToReview + reviewedToday}
            </strong>{" "}
            từ cần ôn tập (Đã ôn {reviewedToday}). Hãy bắt đầu nào!
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 bg-white/15 backdrop-blur-md rounded-xl border border-white/20 px-5 py-3 w-full sm:max-w-md">
              <Search className="w-5 h-5 text-white/60 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleHeroSearch()}
                placeholder="Tra từ vựng nhanh..."
                className="flex-1 text-sm bg-transparent outline-none text-white placeholder:text-white/50"
              />
              <button
                onClick={handleHeroSearch}
                className="px-4 py-2 bg-white text-primary-600 rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors cursor-pointer"
              >
                Tìm
              </button>
            </div>

            {wordsToReview > 0 && (
              <button
                onClick={() => setShowReviewModal(true)}
                className="px-6 py-4 bg-white text-primary-600 rounded-xl text-sm font-bold shadow-lg shadow-black/10 hover:scale-105 transition-transform cursor-pointer flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <span>🧠</span> Ôn tập ngay
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Review List Modal */}
      {showReviewModal && (
        <ReviewListModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          words={reviewWordsList}
          onStartReview={() => router.push('/flashcards?mode=review')}
        />
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          icon="📚"
          label="Từ đã học"
          value={userStats?.learnedWords ?? 0}
          gradient="from-primary-500 to-primary-600"
          delay={0}
        />
        <StatsCard
          icon="🔥"
          label="Streak"
          value={`${userStats?.currentStreak ?? 0} ngày`}
          gradient="from-amber-500 to-orange-500"
          delay={0.1}
        />
        <StatsCard
          icon="🎯"
          label="Trình độ"
          value={`${userStats?.cefrLabel ?? "A1"} · ${userStats?.cefrName ?? "Sơ cấp"}`}
          sub={`${userStats?.cefrProgress ?? 0}%`}
          gradient="from-violet-500 to-purple-500"
          delay={0.2}
        />
        <StatsCard
          icon="🧠"
          label="Độ nhớ"
          value={`${Math.round((userStats?.memoryAccuracy ?? 1) * 100)}%`}
          gradient="from-emerald-500 to-teal-500"
          delay={0.3}
        />
        <StatsCard
          icon="⚡"
          label="Tổng XP"
          value={(userStats?.totalXp ?? 0).toLocaleString()}
          gradient="from-pink-500 to-rose-500"
          delay={0.4}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main column (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Topics grid */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">
                📖 Chủ đề từ vựng
              </h2>
              {topics.length > 6 && (
                <button
                  onClick={() => setShowAllTopics(!showAllTopics)}
                  className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1 cursor-pointer"
                >
                  {showAllTopics
                    ? "Thu gọn"
                    : `Xem tất cả (${topics.length})`}{" "}
                  <ArrowRight
                    className={`w-4 h-4 transition-transform ${showAllTopics ? "rotate-90" : ""}`}
                  />
                </button>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {(showAllTopics ? topics : topics.slice(0, 6)).map(
                (topic, i) => {
                  const colorMap = {
                    "#4CAF50": "from-emerald-400 to-emerald-600",
                    "#2196F3": "from-blue-400 to-blue-600",
                    "#FF9800": "from-amber-400 to-orange-500",
                    "#9C27B0": "from-purple-400 to-purple-600",
                    "#E91E63": "from-pink-400 to-pink-600",
                    "#00BCD4": "from-cyan-400 to-teal-500",
                    "#F44336": "from-red-400 to-red-600",
                    "#3F51B5": "from-indigo-400 to-indigo-600",
                    "#FF5722": "from-orange-400 to-red-500",
                    "#607D8B": "from-slate-400 to-slate-600",
                  };
                  const gradient =
                    colorMap[topic.color_hex] ||
                    "from-primary-400 to-primary-600";
                  const iconMap = {
                    ic_work: "💼",
                    ic_travel: "✈️",
                    ic_food: "🍕",
                    ic_health: "🏥",
                    ic_education: "📚",
                    ic_technology: "💻",
                    ic_nature: "🌿",
                    ic_sport: "⚽",
                    ic_music: "🎵",
                    ic_art: "🎨",
                    ic_science: "🔬",
                    ic_business: "📊",
                    ic_daily: "☀️",
                    ic_ielts: "🎓",
                    ic_toeic: "📋",
                  };
                  const icon = iconMap[topic.icon_url] || "📖";
                  return (
                    <motion.div
                      key={topic.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i }}
                      className="portal-card p-4 flex items-center gap-4 cursor-pointer group"
                      onClick={() =>
                        router.push(`/vocabulary#topic-${topic.id}`)
                      }
                    >
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-xl shadow-md group-hover:scale-110 transition-transform`}
                      >
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {topic.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {topic.total_words || 0} từ
                        </p>
                        <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-1000`}
                            style={{ width: `${topic.progress || 0}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-gray-400">
                        {topic.progress || 0}%
                      </span>
                    </motion.div>
                  );
                }
              )}
            </div>
          </section>

          {/* Recent articles */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">
                📰 Bài đọc mới nhất
              </h2>
              <Link
                href="/reading"
                className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"
              >
                Xem tất cả <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {ARTICLES.slice(0, 4).map((article, i) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                >
                  <Link
                    href={`/reading/${article.slug}`}
                    className="portal-card block overflow-hidden group"
                  >
                    <div className="aspect-[16/9] overflow-hidden">
                      <img
                        src={article.thumbnail}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                          {article.level}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {article.readingTime} phút đọc
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary-600 transition-colors">
                        {article.title}
                      </h3>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Words Studied Chart */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">
              📈 Số từ đã học tuần này
            </h2>
            <div className="portal-card p-5">
              <div className="flex items-end gap-3" style={{ height: 280 }}>
                {studyStats.weeklyChart.map((item, i) => {
                  const barHeight = studyStats.maxCount > 0
                    ? Math.max(4, (item.count / studyStats.maxCount) * 260)
                    : 4;
                  return (
                    <div
                      key={item.day}
                      className="flex-1 flex flex-col items-center justify-end h-full"
                    >
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: barHeight }}
                        transition={{ duration: 0.8, delay: 0.1 * i }}
                        className={`w-full rounded-t-lg relative group cursor-pointer ${
                          item.count > 0
                            ? "bg-gradient-to-t from-primary-500 to-secondary-400"
                            : "bg-gray-200"
                        }`}
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {item.count} từ
                        </div>
                      </motion.div>
                      <span className="text-[11px] text-gray-400 font-medium mt-2">
                        {item.day}
                      </span>
                      <span className="text-[8px] text-gray-300">
                        {item.dateLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar column (1/3) */}
        <div className="space-y-4">
          <DailyGoalWidget
            learnedToday={learnedToday}
            dailyGoal={userStats?.dailyGoal ?? 20}
            reviewedToday={reviewedToday}
            reviewGoal={wordsToReview + reviewedToday}
            streak={userStats?.currentStreak ?? 0}
            onReviewClick={() => setShowReviewModal(true)}
            onNewClick={() => router.push('/flashcards')}
          />
          <StreakWidget
            currentStreak={userStats?.currentStreak ?? 0}
            longestStreak={userStats?.longestStreak ?? 0}
            usedGracePeriod={userStats?.usedGracePeriod ?? false}
            lastStudyDate={userStats?.lastStudyDate ?? null}
          />
          <DifficultWordsWidget />

          {/* Random word */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="portal-card p-5"
          >
            <h3 className="text-sm font-semibold text-foreground mb-3">
              💡 Từ vựng ngẫu nhiên
            </h3>
            <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl p-4">
              <p className="text-lg font-bold text-foreground">
                {randomWord.word}
              </p>
              <p className="text-xs text-gray-500 font-mono mb-2">
                {randomWord.phonetic_uk}
              </p>
              <p className="text-sm text-gray-600">
                {randomWord.meanings[0]}
              </p>
              {randomWord.examples[0] && (
                <p className="text-xs text-gray-400 mt-2 italic">
                  &ldquo;{randomWord.examples[0].en}&rdquo;
                </p>
              )}
            </div>
          </motion.div>

          {/* Leaderboard */}
          <LeaderboardWidget entries={leaderboard} />
        </div>
      </div>
    </div>
  );
}
