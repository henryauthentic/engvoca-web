"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Loader2, Volume2, Star, Timer, Shuffle, Sparkles, ChevronDown, ChevronRight, Target, Trophy, Flame, Zap, BookOpen, CheckCircle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import {
  getWordsByTopic,
  getTopics,
  getUserStats,
  getWordProgress,
  getWordsToReviewToday,
  reviewWord,
  savePracticeResult,
  updateStreakAfterStudy,
} from "@/lib/firestoreService";
import { speak, speakSlow, stopSpeaking } from "@/lib/tts";
import { mapWordProgress, calculateMemoryAccuracy } from "@/mappers/wordProgressMapper";
import TopicSelector from "@/components/portal/TopicSelector";

// ==========================
//  Tạo câu hỏi theo 3 dạng
// ==========================
function generateQuestions(words, mode = "mixed", shouldRandom = true) {
  if (words.length < 4) return [];

  const pool = shouldRandom
    ? [...words].sort(() => Math.random() - 0.5).slice(0, 15)
    : [...words].slice(0, 15);

  return pool.map((word) => {
    let type;
    if (mode === "quiz") type = "quiz";
    else if (mode === "fill_blank") type = "fill_blank";
    else if (mode === "listening") type = "listening";
    else {
      // mixed mode
      const r = Math.random();
      type = r < 0.4 ? "quiz" : r < 0.7 ? "fill_blank" : "listening";
    }

    // Tạo 4 đáp án cho quiz
    let options = [];
    if (type === "quiz") {
      const others = words
        .filter((w) => w.id !== word.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      options = [
        ...others.map((o) => ({ text: o.meaning, correct: false })),
        { text: word.meaning, correct: true },
      ].sort(() => Math.random() - 0.5);
    }

    // Tạo câu đục lỗ
    let blankSentence = "";
    if (type === "fill_blank" || type === "listening") {
      if (word.example) {
        blankSentence = word.example.replace(
          new RegExp(word.word, "gi"),
          "_____"
        );
      } else {
        blankSentence = `The word "_____" means: ${word.meaning}`;
      }
    }

    return { word, type, options, blankSentence };
  });
}

// Helper: map Firebase icon/color to UI
const COLOR_MAP = {
  '#4CAF50': 'from-emerald-400 to-emerald-600',
  '#2196F3': 'from-blue-400 to-blue-600',
  '#FF9800': 'from-amber-400 to-orange-500',
  '#9C27B0': 'from-purple-400 to-purple-600',
  '#E91E63': 'from-pink-400 to-pink-600',
  '#00BCD4': 'from-cyan-400 to-teal-500',
  '#F44336': 'from-red-400 to-red-600',
  '#3F51B5': 'from-indigo-400 to-indigo-600',
  '#FF5722': 'from-orange-400 to-red-500',
  '#607D8B': 'from-slate-400 to-slate-600',
};
const ICON_MAP = {
  'ic_work': '💼', 'ic_travel': '✈️', 'ic_food': '🍕',
  'ic_health': '🏥', 'ic_education': '📚', 'ic_technology': '💻',
  'ic_nature': '🌿', 'ic_sport': '⚽', 'ic_music': '🎵',
  'ic_art': '🎨', 'ic_science': '🔬', 'ic_business': '📊',
  'ic_daily': '☀️', 'ic_ielts': '🎓', 'ic_toeic': '📋',
};

// ==========================
//  Component chính
// ==========================
export default function PracticePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTopic = searchParams.get("topic");
  const modeParam = searchParams.get("mode") || null;
  const { user } = useAuth();

  // States
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState("lobby");
  const [selectedMode, setSelectedMode] = useState(modeParam || "mixed");
  const [parentTopics, setParentTopics] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState(null);
  const [allChildTopics, setAllChildTopics] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState(preselectedTopic || "");
  const [topicName, setTopicName] = useState("");
  const [allWords, setAllWords] = useState([]);
  const [difficultWordIds, setDifficultWordIds] = useState(new Set());
  const [onlyDifficult, setOnlyDifficult] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [fillInput, setFillInput] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [details, setDetails] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);
  // Advanced options
  const [timeLimit, setTimeLimit] = useState(false);
  const [randomOrder, setRandomOrder] = useState(true);
  const [prioritizeNew, setPrioritizeNew] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(45);
  // Stats for hero
  const [heroStats, setHeroStats] = useState({ streak: 0, learned: 0, toReview: 0, accuracy: 0, xpToday: 0 });
  const [progressMap, setProgressMap] = useState({});

  const fillRef = useRef(null);
  const timerRef = useRef(null);

  // Load topics + hero stats
  useEffect(() => {
    async function loadTopics() {
      if (!user?.uid) return;
      try {
        const [allTopicsData, rawUser, rawProgress, reviewWords] = await Promise.all([
          getTopics(),
          getUserStats(user.uid),
          getWordProgress(user.uid),
          getWordsToReviewToday(user.uid),
        ]);
        const parents = allTopicsData.filter((t) => !t.parent_id);
        const children = allTopicsData.filter((t) => t.parent_id);

        setParentTopics(parents);
        setAllChildTopics(children);

        // Build topic progress map
        const topicProg = rawUser?.topicProgress || {};
        setProgressMap(topicProg);

        // Hero stats
        const accuracy = calculateMemoryAccuracy(rawProgress);
        setHeroStats({
          streak: rawUser?.currentStreak || 0,
          learned: rawUser?.learnedWords || 0,
          toReview: reviewWords?.length || 0,
          accuracy: Math.round(accuracy * 100),
          xpToday: rawUser?.todayXp || 0,
        });

        if (parents.length > 0) {
          const firstParent = parents[0];
          setSelectedParentId(firstParent.id);
          const firstChildren = children.filter((c) => c.parent_id === firstParent.id);
          if (preselectedTopic) {
            setSelectedTopicId(preselectedTopic);
          } else if (firstChildren.length > 0) {
            setSelectedTopicId(firstChildren[0].id);
          }
        }
      } catch (e) {
        console.error("Lỗi load topics:", e);
      } finally {
        setLoading(false);
      }
    }
    loadTopics();
  }, [user, preselectedTopic]);

  // Filtered child topics for selected parent
  const allTopics = allChildTopics.filter((t) => t.parent_id === selectedParentId);

  // Load words when topic changes - CHỈ lấy từ đã học
  useEffect(() => {
    async function loadWords() {
      if (!selectedTopicId || !user?.uid) return;
      try {
        const [words, progress] = await Promise.all([
          getWordsByTopic(selectedTopicId),
          getWordProgress(user.uid),
        ]);
        // Tạo Set các wordId đã học (có trong wordProgress) — sử dụng mapper
        const learnedIds = new Set();
        const diffIds = new Set();
        progress.forEach((p) => {
          const mapped = mapWordProgress(p);
          if (mapped && mapped.wordId) {
            learnedIds.add(mapped.wordId);
            if (mapped.isDifficult || mapped.wrongCount >= 3) {
              diffIds.add(mapped.wordId);
            }
          }
        });
        setDifficultWordIds(diffIds);

        // Chỉ giữ lại từ đã học trong chủ đề này
        const learnedWords = words.filter((w) => learnedIds.has(w.id));
        setAllWords(learnedWords);
        const topic = allTopics.find((t) => t.id === selectedTopicId);
        setTopicName(topic?.name || "Luyện tập");
      } catch (e) {
        console.error("Lỗi load words:", e);
      }
    }
    loadWords();
  }, [selectedTopicId, allTopics, user]);

  // Auto-play audio cho listening mode
  useEffect(() => {
    if (
      phase === "playing" &&
      questions[currentQ]?.type === "listening" &&
      !hasPlayedAudio &&
      !answered
    ) {
      speak(questions[currentQ].word.word);
      setHasPlayedAudio(true);
    }
  }, [currentQ, phase, questions, hasPlayedAudio, answered]);

  // Auto-focus textbox
  useEffect(() => {
    if (
      phase === "playing" &&
      (questions[currentQ]?.type === "fill_blank" ||
        questions[currentQ]?.type === "listening") &&
      !answered
    ) {
      setTimeout(() => fillRef.current?.focus(), 300);
    }
  }, [currentQ, phase, questions, answered]);

  // Timer countdown effect
  useEffect(() => {
    if (phase !== "playing" || !timeLimit || answered) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setTimeRemaining(45);
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, currentQ, timeLimit, answered]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLimit && timeRemaining === 0 && phase === "playing" && !answered) {
      checkAnswerRef.current();
    }
  }, [timeRemaining, timeLimit, phase, answered]);

  // ========= ACTIONS =========
  const startPractice = () => {
    let pool = allWords;
    if (onlyDifficult) {
      pool = allWords.filter(w => difficultWordIds.has(w.id));
      if (pool.length < 4) {
        alert("Không đủ từ khó để ôn tập (cần ít nhất 4 từ). Vui lòng tắt tùy chọn này hoặc chọn chủ đề khác!");
        return;
      }
    } else if (pool.length < 4) {
      alert("Chủ đề này cần ít nhất 4 từ đã học để luyện tập!");
      return;
    }

    // Prioritize new words: sort by firstLearnedDate descending
    if (prioritizeNew) {
      pool = [...pool].sort((a, b) => {
        const dateA = a.firstLearnedDate || a.first_learned_date || '';
        const dateB = b.firstLearnedDate || b.first_learned_date || '';
        return dateB.localeCompare(dateA);
      });
    }

    const qs = generateQuestions(pool, selectedMode, randomOrder);
    setQuestions(qs);
    setCurrentQ(0);
    setCorrectCount(0);
    setWrongCount(0);
    setDetails([]);
    setAnswered(false);
    setSelectedOption(null);
    setFillInput("");
    setStartTime(Date.now());
    setTimeRemaining(45);
    setPhase("playing");
  };

  const checkAnswerRef = useRef(null);

  const checkAnswer = () => {
    if (answered) return;
    const q = questions[currentQ];
    let isCorrect = false;
    let userAnswer = "";

    if (q.type === "quiz") {
      if (selectedOption === null) {
        userAnswer = "(không chọn)";
      } else {
        userAnswer = q.options[selectedOption].text;
        isCorrect = q.options[selectedOption].correct;
      }
    } else {
      // fill_blank hoặc listening
      userAnswer = fillInput.trim();
      if (!userAnswer) {
        userAnswer = "(bỏ trống)";
      } else {
        isCorrect =
          userAnswer.toLowerCase() === q.word.word.toLowerCase();
      }
    }

    setAnswered(true);
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
    } else {
      setWrongCount((c) => c + 1);
    }

    setDetails((prev) => [
      ...prev,
      {
        word: q.word.word,
        meaning: q.word.meaning,
        userAnswer,
        correctAnswer: q.type === "quiz" ? q.word.meaning : q.word.word,
        isCorrect,
        type: q.type,
      },
    ]);

    // ✅ Resolve parentTopicId for safe topic progress tracking
    if (user?.uid) {
      const wordTopicId = q.word.topic_id || q.word.a_topic_id;
      const directTopic = allChildTopics.find(t => t.id === wordTopicId);
      const parentTopicId = directTopic?.parent_id || selectedParentId || wordTopicId;
      reviewWord(user.uid, q.word.id, isCorrect ? 4 : 1, parentTopicId).catch(console.error);
    }
  };
  checkAnswerRef.current = checkAnswer;

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((c) => c + 1);
      setAnswered(false);
      setSelectedOption(null);
      setFillInput("");
      setHasPlayedAudio(false);
    } else {
      finishPractice();
    }
  };

  const finishPractice = async () => {
    setPhase("result");
    const total = questions.length;
    const accuracy = total > 0 ? correctCount / total : 0;
    const xpEarned = correctCount * 10 + (accuracy > 0.8 ? 50 : 0);

    if (user?.uid) {
      await savePracticeResult(user.uid, correctCount, total, xpEarned).catch(
        console.error
      );
      // ✅ Update streak once per session
      updateStreakAfterStudy(user.uid).catch(console.error);
    }
  };

  // ==============================
  //  LOADING
  // ==============================
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
          <span>Đang tải bài luyện tập...</span>
        </div>
      </div>
    );
  }

  // ==============================
  //  LOBBY - Chọn chế độ
  // ==============================
  if (phase === "lobby") {
    const modes = [
      { id: "quiz", label: "Trắc nghiệm", desc: "Chọn đáp án đúng từ các lựa chọn", emoji: "📝", iconBg: "bg-blue-100", tag: "Phổ biến" },
      { id: "fill_blank", label: "Điền từ", desc: "Gõ từ tiếng Anh phù hợp vào chỗ trống", emoji: "✏️", iconBg: "bg-orange-100" },
      { id: "listening", label: "Luyện nghe", desc: "Nghe audio và chọn đáp án đúng", emoji: "🎧", iconBg: "bg-pink-100" },
      { id: "mixed", label: "Tổng hợp", desc: "Kết hợp tất cả kỹ năng: nghe, đọc, viết", emoji: "🔀", iconBg: "bg-purple-100" },
    ];

    const advancedOpts = [
      { key: "onlyDifficult", label: "Chỉ ôn tập từ khó", desc: "Ưu tiên từ bạn hay sai", icon: <Star className="w-5 h-5" />, iconBg: "bg-amber-100 text-amber-600", value: onlyDifficult, setter: setOnlyDifficult },
      { key: "timeLimit", label: "Giới hạn thời gian", desc: "45 giây mỗi câu", icon: <Timer className="w-5 h-5" />, iconBg: "bg-blue-100 text-blue-600", value: timeLimit, setter: setTimeLimit },
      { key: "randomOrder", label: "Random câu hỏi", desc: "Trộn câu hỏi ngẫu nhiên", icon: <Shuffle className="w-5 h-5" />, iconBg: "bg-purple-100 text-purple-600", value: randomOrder, setter: setRandomOrder },
      { key: "prioritizeNew", label: "Ưu tiên từ mới", desc: "Từ chưa học trước", icon: <Sparkles className="w-5 h-5" />, iconBg: "bg-emerald-100 text-emerald-600", value: prioritizeNew, setter: setPrioritizeNew },
    ];

    const BAR_COLORS = ['bg-blue-500','bg-red-400','bg-pink-400','bg-violet-500','bg-emerald-500','bg-amber-500','bg-cyan-500','bg-indigo-500'];

    return (
      <div className="max-w-5xl mx-auto">
        {/* ── Hero ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2 flex items-center gap-3">
              <span className="text-4xl">🎯</span> Luyện tập Quiz
            </h1>
            <p className="text-gray-500">Chọn chủ đề và chế độ luyện tập phù hợp với mục tiêu của bạn</p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <motion.span animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity }} className="text-5xl">🏆</motion.span>
            <motion.span animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, delay: 0.5, repeat: Infinity }} className="text-4xl">⭐</motion.span>
          </div>
        </motion.div>

        {/* ── Stats Cards ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10">
          {[
            { icon: <Flame className="w-5 h-5 text-orange-500" />, iconBg: "bg-orange-100", label: "CHUỖI HỌC", value: heroStats.streak, unit: "ngày", sub: "🔥 Tuyệt vời!", subColor: "text-orange-500" },
            { icon: <BookOpen className="w-5 h-5 text-blue-500" />, iconBg: "bg-blue-100", label: "TỪ ĐÃ HỌC", value: heroStats.learned, unit: "từ", sub: "↑ 16 từ mới tuần này", subColor: "text-emerald-500" },
            { icon: <Target className="w-5 h-5 text-emerald-500" />, iconBg: "bg-emerald-100", label: "CẦN ÔN HÔM NAY", value: heroStats.toReview, unit: "từ", sub: "Ôn để ghi nhớ lâu hơn", subColor: "text-gray-400" },
            { icon: <CheckCircle className="w-5 h-5 text-violet-500" />, iconBg: "bg-violet-100", label: "ĐỘ CHÍNH XÁC", value: `${heroStats.accuracy}%`, unit: "", sub: "↑ 5% so với tuần trước", subColor: "text-emerald-500" },
            { icon: <Zap className="w-5 h-5 text-amber-500" />, iconBg: "bg-amber-100", label: "XP HÔM NAY", value: heroStats.xpToday, unit: "XP", sub: "Còn 60 XP để lên cấp", subColor: "text-gray-400" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}
              className="portal-card p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`w-9 h-9 rounded-xl ${s.iconBg} flex items-center justify-center`}>{s.icon}</div>
                <span className="text-[10px] font-bold text-gray-400 tracking-wider">{s.label}</span>
              </div>
              <p className="text-3xl font-extrabold text-foreground leading-none">{s.value} <span className="text-sm font-semibold text-gray-400">{s.unit}</span></p>
              <p className={`text-[10px] ${s.subColor} font-semibold mt-1.5`}>{s.sub}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Chọn chủ đề ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-5">📖 Chọn chủ đề</h3>
          <TopicSelector
            parentTopics={parentTopics}
            selectedParentId={selectedParentId}
            onSelectParent={(id) => {
              setSelectedParentId(id);
              const ch = allChildTopics.filter(c => c.parent_id === id);
              if (ch.length > 0) setSelectedTopicId(ch[0].id);
            }}
            childTopics={allTopics}
            selectedTopicId={selectedTopicId}
            onSelectTopic={setSelectedTopicId}
            progressMap={progressMap}
            className="mb-8"
          />
        </motion.div>

        {/* ── Chế độ luyện tập ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
          <h3 className="text-base font-bold text-foreground mb-5 flex items-center gap-2">🎮 Chọn chế độ luyện tập</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {modes.map((m) => (
              <motion.button key={m.id} onClick={() => setSelectedMode(m.id)} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
                className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer relative ${
                  selectedMode === m.id ? "border-primary-500 bg-primary-50 shadow-xl shadow-primary-500/10" : "border-transparent bg-[var(--surface-elevated)] hover:shadow-md"
                }`}>
                {m.tag && selectedMode === m.id && <span className="absolute bottom-3 left-5 text-[9px] font-black text-primary-500">{m.tag}</span>}
                <div className={`w-12 h-12 rounded-xl ${m.iconBg} flex items-center justify-center text-2xl mb-3`}>{m.emoji}</div>
                <p className="text-sm font-extrabold text-foreground mb-1">{m.label}</p>
                <p className="text-[10px] text-gray-400 leading-relaxed">{m.desc}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── Tùy chọn nâng cao ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-10">
          <h3 className="text-base font-bold text-foreground mb-5 flex items-center gap-2">⚙️ Tùy chọn nâng cao</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {advancedOpts.map((opt) => (
              <div key={opt.key} className="portal-card p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl ${opt.iconBg} flex items-center justify-center`}>{opt.icon}</div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={opt.value} onChange={(e) => opt.setter(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{opt.label}</p>
                  <p className="text-[10px] text-gray-400">{opt.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── CTA ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <motion.button onClick={startPractice} disabled={allWords.length < 4} whileHover={{ scale: 1.01, y: -2 }} whileTap={{ scale: 0.99 }}
            className="w-full py-5 bg-gradient-to-r from-primary-500 via-violet-500 to-secondary-500 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-primary-500/30 disabled:opacity-50 disabled:shadow-none cursor-pointer transition-all flex items-center justify-center gap-3 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <span className="text-xl">🚀</span> Bắt đầu luyện tập
            <ChevronRight className="w-5 h-5" />
          </motion.button>
          <p className="text-center text-xs text-gray-400 mt-3">
            {allWords.length >= 4 ? `${allWords.length} từ đã sẵn sàng` : "Cần ít nhất 4 từ đã học để luyện tập. Hãy học Flashcard trước!"}
          </p>
        </motion.div>
      </div>
    );
  }

  // ==============================
  //  RESULT - Kết quả
  // ==============================
  if (phase === "result") {
    const total = questions.length;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const xpEarned = correctCount * 10 + (accuracy > 80 ? 50 : 0);
    const duration = Math.round((Date.now() - startTime) / 1000);

    return (
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="portal-card p-8 text-center"
        >
          <div className="text-6xl mb-4">
            {accuracy >= 80 ? "🏆" : accuracy >= 50 ? "👍" : "💪"}
          </div>
          <h2 className="text-2xl font-extrabold text-foreground mb-2">
            Kết quả
          </h2>
          <p className="text-gray-500 mb-6">
            {accuracy >= 80
              ? "Xuất sắc!"
              : accuracy >= 50
                ? "Khá tốt!"
                : "Cần cố gắng thêm!"}
          </p>
          <div className="grid grid-cols-4 gap-3 mb-8">
            <div className="portal-card p-3 text-center">
              <p className="text-xl font-extrabold text-amber-500">
                +{xpEarned}
              </p>
              <p className="text-[10px] text-gray-400">XP</p>
            </div>
            <div className="portal-card p-3 text-center">
              <p className="text-xl font-extrabold text-emerald-500">
                {correctCount}/{total}
              </p>
              <p className="text-[10px] text-gray-400">Đúng</p>
            </div>
            <div className="portal-card p-3 text-center">
              <p className="text-xl font-extrabold text-foreground">
                {accuracy}%
              </p>
              <p className="text-[10px] text-gray-400">Chính xác</p>
            </div>
            <div className="portal-card p-3 text-center">
              <p className="text-xl font-extrabold text-primary-500">
                {duration}s
              </p>
              <p className="text-[10px] text-gray-400">Thời gian</p>
            </div>
          </div>

          {/* Chi tiết */}
          <div className="space-y-2 mb-6 max-h-56 overflow-y-auto text-left">
            {details.map((d, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 p-3 rounded-xl text-sm ${d.isCorrect ? "bg-emerald-50" : "bg-red-50"}`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 ${d.isCorrect ? "bg-emerald-500" : "bg-red-500"}`}
                >
                  {d.isCorrect ? "✓" : "✗"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{d.word}</p>
                  {!d.isCorrect && (
                    <p className="text-xs text-gray-500">
                      Đáp án: {d.correctAnswer}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 px-2 py-0.5 bg-white rounded-full">
                  {d.type === "quiz"
                    ? "📝"
                    : d.type === "fill_blank"
                      ? "✏️"
                      : "🎧"}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push("/dashboard")}
              className="px-6 py-3 bg-gray-200 text-foreground rounded-xl font-semibold cursor-pointer"
            >
              Về trang chủ
            </button>
            <button
              onClick={() => {
                setPhase("lobby");
                setCurrentQ(0);
                setCorrectCount(0);
                setWrongCount(0);
                setDetails([]);
              }}
              className="px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl font-semibold cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 inline mr-2" /> Làm lại
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ==============================
  //  PLAYING - Đang chơi
  // ==============================
  const q = questions[currentQ];
  if (!q) return null;

  const progressPct = ((currentQ + 1) / questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-foreground">
          Câu {currentQ + 1}/{questions.length}
        </span>
        <div className="flex items-center gap-2">
          {timeLimit && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
              timeRemaining <= 10 ? "bg-red-50 text-red-600 animate-pulse" : "bg-blue-50 text-blue-600"
            }`}>
              <Timer className="w-3.5 h-3.5" /> {timeRemaining}s
            </span>
          )}
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 font-semibold">
            ✅ {correctCount}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-600 font-semibold">
            ❌ {wrongCount}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
        <motion.div
          className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
      {/* Timer bar */}
      {timeLimit && !answered && (
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-4">
          <motion.div
            className={`h-full rounded-full ${timeRemaining <= 10 ? "bg-red-500" : "bg-blue-400"}`}
            animate={{ width: `${(timeRemaining / 45) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
      {(!timeLimit || answered) && <div className="mb-4" />}

      {/* Question content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
        >
          {/* ===== QUIZ MODE ===== */}
          {q.type === "quiz" && (
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg mb-5">
                <span className="text-sm">📝</span>
                <span className="text-xs font-bold text-blue-600">
                  Trắc nghiệm
                </span>
              </div>

              {/* Word card */}
              <div className="w-full p-7 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white text-center shadow-lg shadow-purple-500/20 mb-6">
                <h2 className="text-3xl font-extrabold mb-2">{q.word.word}</h2>
                {q.word.pronunciation && (
                  <p className="text-white/70 italic mb-3">
                    {q.word.pronunciation}
                  </p>
                )}
                {q.word.example && (
                  <div className="p-3 bg-white/15 rounded-xl">
                    <p className="text-sm text-white/90 italic">
                      💬 {q.word.example}
                    </p>
                  </div>
                )}
              </div>

              <p className="text-sm font-semibold text-foreground mb-3">
                Chọn nghĩa đúng:
              </p>

              {/* Options */}
              <div className="space-y-2.5">
                {q.options.map((opt, i) => {
                  let style =
                    "bg-surface border-border-color hover:border-primary-300";
                  if (answered) {
                    if (opt.correct)
                      style = "bg-emerald-50 border-emerald-400 text-emerald-700";
                    else if (i === selectedOption && !opt.correct)
                      style = "bg-red-50 border-red-400 text-red-700";
                    else style = "bg-gray-50 border-gray-200 opacity-50";
                  } else if (i === selectedOption) {
                    style = "bg-primary-50 border-primary-400";
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => !answered && setSelectedOption(i)}
                      disabled={answered}
                      className={`w-full p-4 rounded-xl border-2 text-left flex items-center gap-3 transition-all cursor-pointer ${style}`}
                    >
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          answered && opt.correct
                            ? "bg-emerald-500 text-white"
                            : answered && i === selectedOption && !opt.correct
                              ? "bg-red-500 text-white"
                              : i === selectedOption
                                ? "bg-primary-500 text-white"
                                : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {answered && opt.correct
                          ? "✓"
                          : answered && i === selectedOption && !opt.correct
                            ? "✗"
                            : String.fromCharCode(65 + i)}
                      </span>
                      <span className="text-sm font-medium">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== FILL BLANK MODE ===== */}
          {q.type === "fill_blank" && (
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 rounded-lg mb-5">
                <span className="text-sm">✏️</span>
                <span className="text-xs font-bold text-purple-600">
                  Điền từ
                </span>
              </div>

              {/* Sentence with blank */}
              <div className="w-full p-6 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 text-white text-center shadow-lg shadow-purple-500/20 mb-6">
                <p className="text-lg font-semibold leading-relaxed">
                  {q.blankSentence}
                </p>
                <p className="text-sm text-white/60 mt-3">
                  Nghĩa: {q.word.meaning}
                </p>
              </div>

              <p className="text-sm font-semibold text-foreground mb-3">
                Điền từ tiếng Anh:
              </p>

              <input
                ref={fillRef}
                type="text"
                value={fillInput}
                onChange={(e) => setFillInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !answered && checkAnswer()
                }
                disabled={answered}
                placeholder="Gõ từ tiếng Anh..."
                className={`w-full p-4 rounded-xl border-2 text-center text-xl font-bold outline-none transition-all ${
                  answered
                    ? details[details.length - 1]?.isCorrect
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                      : "border-red-400 bg-red-50 text-red-700"
                    : "border-border-color bg-surface text-foreground focus:border-primary-400"
                }`}
              />

              {/* Show answer */}
              {answered && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 p-4 rounded-xl border-2 ${
                    details[details.length - 1]?.isCorrect
                      ? "bg-emerald-50 border-emerald-300"
                      : "bg-red-50 border-red-300"
                  }`}
                >
                  <p className="text-center font-bold text-lg">
                    {details[details.length - 1]?.isCorrect
                      ? "🎉 Chính xác!"
                      : "❌ Sai rồi!"}
                  </p>
                  <p className="text-center text-sm text-gray-600 mt-1">
                    Đáp án: <strong>{q.word.word}</strong> – {q.word.meaning}
                  </p>
                </motion.div>
              )}
            </div>
          )}

          {/* ===== LISTENING MODE ===== */}
          {q.type === "listening" && (
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 rounded-lg mb-5">
                <span className="text-sm">🎧</span>
                <span className="text-xs font-bold text-pink-600">
                  Luyện nghe
                </span>
              </div>

              {/* Speaker button */}
              <div className="flex flex-col items-center mb-6">
                <button
                  onClick={() => speak(q.word.word)}
                  className="w-28 h-28 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shadow-2xl shadow-pink-500/30 cursor-pointer hover:scale-105 transition-transform mb-4"
                >
                  <Volume2 className="w-14 h-14 text-white" />
                </button>
                <p className="text-sm text-gray-400 mb-2">Nhấn để nghe lại</p>
                <button
                  onClick={() => speakSlow(q.word.word)}
                  className="px-4 py-2 rounded-full bg-gray-100 text-sm text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  🐢 Nghe chậm
                </button>
              </div>

              <p className="text-sm font-semibold text-foreground mb-3">
                Nghe và gõ lại từ tiếng Anh:
              </p>

              <input
                ref={fillRef}
                type="text"
                value={fillInput}
                onChange={(e) => setFillInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !answered && checkAnswer()
                }
                disabled={answered}
                autoComplete="off"
                autoCorrect="off"
                placeholder="Gõ từ bạn nghe được..."
                className={`w-full p-4 rounded-xl border-2 text-center text-xl font-bold outline-none transition-all ${
                  answered
                    ? details[details.length - 1]?.isCorrect
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                      : "border-red-400 bg-red-50 text-red-700"
                    : "border-border-color bg-surface text-foreground focus:border-pink-400"
                }`}
              />

              {answered && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 p-4 rounded-xl border-2 ${
                    details[details.length - 1]?.isCorrect
                      ? "bg-emerald-50 border-emerald-300"
                      : "bg-red-50 border-red-300"
                  }`}
                >
                  <p className="text-center font-bold text-lg">
                    {details[details.length - 1]?.isCorrect
                      ? "🎉 Chính xác!"
                      : "❌ Sai rồi!"}
                  </p>
                  <p className="text-center text-sm text-gray-600 mt-1">
                    Đáp án: <strong>{q.word.word}</strong> – {q.word.meaning}
                  </p>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom button */}
      <div className="mt-6">
        {!answered ? (
          <button
            onClick={checkAnswer}
            disabled={
              q.type === "quiz"
                ? selectedOption === null
                : fillInput.trim() === ""
            }
            className="w-full py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl font-bold text-base cursor-pointer hover:from-primary-600 hover:to-secondary-600 transition-all shadow-lg shadow-primary-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Kiểm tra
          </button>
        ) : (
          <button
            onClick={nextQuestion}
            className="w-full py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl font-bold text-base cursor-pointer hover:from-primary-600 hover:to-secondary-600 transition-all shadow-lg shadow-primary-500/20"
          >
            {currentQ < questions.length - 1 ? "Câu tiếp theo →" : "Xem kết quả"}
          </button>
        )}
      </div>
    </div>
  );
}
