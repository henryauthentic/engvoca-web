"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Loader2, Volume2, Star } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import {
  getWordsToReviewToday,
  getWordsByIds,
  getUserStats,
  getTopics,
  reviewWord,
  savePracticeResult,
} from "@/lib/firestoreService";
import { speak } from "@/lib/tts";
import { mapWordProgress } from "@/mappers/wordProgressMapper";

// ==========================
//  Tạo câu hỏi theo 3 dạng
// ==========================
function generateQuestions(words, mode = "mixed") {
  if (words.length < 4) return [];

  const shuffled = [...words].sort(() => Math.random() - 0.5).slice(0, 15);

  return shuffled.map((word) => {
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
  const [phase, setPhase] = useState("lobby"); // lobby | playing | result
  const [selectedMode, setSelectedMode] = useState(modeParam || "mixed");
  const [topicName, setTopicName] = useState("Ôn tập hằng ngày");
  const [allWords, setAllWords] = useState([]);
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

  const fillRef = useRef(null);

  // ✅ Topics list for parent topic resolution
  const [topicsList, setTopicsList] = useState([]);

  useEffect(() => {
    async function loadWords() {
      if (!user?.uid) return;
      try {
        const [progressWords, allTopics] = await Promise.all([
          getWordsToReviewToday(user.uid),
          getTopics(),
        ]);
        setTopicsList(allTopics);
        
        // Cần map wordProgress thành định dạng word object giống như trong bảng vocab
        const wordIds = progressWords.map(w => w.word_id || w.id);
        
        const fullWords = await getWordsByIds(wordIds);
        
        // Merge progress data vào word
        const reviewWords = fullWords.map(word => {
            const prog = progressWords.find(p => p.word_id === word.id || p.id === word.id);
            return {
                ...word,
                progress: prog // Nếu cần dùng cho SM-2
            }
        });
        
        setAllWords(reviewWords);
      } catch (e) {
        console.error("Lỗi load words:", e);
      } finally {
        setLoading(false);
      }
    }
    loadWords();
  }, [user]);

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

    const qs = generateQuestions(pool, selectedMode);
    setQuestions(qs);
    setCurrentQ(0);
    setCorrectCount(0);
    setWrongCount(0);
    setDetails([]);
    setAnswered(false);
    setSelectedOption(null);
    setFillInput("");
    setStartTime(Date.now());
    setPhase("playing");
  };

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
      const directTopic = topicsList.find(t => t.id === wordTopicId);
      const parentTopicId = directTopic?.parent_id || wordTopicId;
      reviewWord(user.uid, q.word.id, isCorrect ? 4 : 1, parentTopicId).catch(console.error);
    }
  };

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
      {
        id: "quiz",
        label: "Trắc nghiệm",
        desc: "Chọn nghĩa đúng",
        emoji: "📝",
        color: "from-blue-500 to-indigo-500",
      },
      {
        id: "fill_blank",
        label: "Điền từ",
        desc: "Gõ từ tiếng Anh",
        emoji: "✏️",
        color: "from-purple-500 to-violet-500",
      },
      {
        id: "listening",
        label: "Luyện nghe",
        desc: "Nghe và gõ lại",
        emoji: "🎧",
        color: "from-pink-500 to-rose-500",
      },
      {
        id: "mixed",
        label: "Tổng hợp",
        desc: "Tất cả chế độ",
        emoji: "🔀",
        color: "from-amber-500 to-orange-500",
      },
    ];

    return (
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🧠</div>
            <h1 className="text-2xl font-extrabold text-foreground mb-2">Ôn tập hằng ngày</h1>
            <p className="text-gray-500">Thuật toán SM-2 giúp bạn nhớ từ vựng lâu hơn</p>
          </div>
          {/* Chọn chế độ */}
          <div className="portal-card p-6 mb-6">
            <h3 className="text-sm font-bold text-foreground mb-3">🎮 Chế độ luyện tập</h3>
            <div className="grid grid-cols-2 gap-3">
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMode(m.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    selectedMode === m.id
                      ? "border-primary-500 bg-primary-50"
                      : "border-border-color bg-surface hover:border-primary-300"
                  }`}
                >
                  <div className="text-2xl mb-1">{m.emoji}</div>
                  <p className="text-sm font-bold text-foreground">{m.label}</p>
                  <p className="text-xs text-gray-400">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Bỏ tùy chọn chỉ ôn từ khó ở Daily Review */}

          {/* Stats preview */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="portal-card p-4 text-center">
              <p className="text-xl font-bold text-primary-600">
                {Math.min(allWords.length, 15)}
              </p>
              <p className="text-xs text-gray-400">Câu hỏi</p>
            </div>
            <div className="portal-card p-4 text-center">
              <p className="text-xl font-bold text-amber-600">
                {selectedMode === "listening" ? "🎧" : "∞"}
              </p>
              <p className="text-xs text-gray-400">Thời gian</p>
            </div>
            <div className="portal-card p-4 text-center">
              <p className="text-xl font-bold text-emerald-600">+10</p>
              <p className="text-xs text-gray-400">XP/câu</p>
            </div>
          </div>

          <button
            onClick={startPractice}
            disabled={allWords.length === 0}
            className="w-full py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl font-semibold text-lg hover:from-primary-600 hover:to-secondary-600 transition-all cursor-pointer shadow-lg shadow-primary-500/20 disabled:opacity-50"
          >
            🚀 Bắt đầu ôn tập ({allWords.length} từ đến hạn)
          </button>
          {allWords.length === 0 && (
            <p className="text-xs text-emerald-500 mt-2 text-center font-semibold">
              Tuyệt vời! Bạn không còn từ nào đến hạn ôn tập hôm nay.
            </p>
          )}
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
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 font-semibold">
            ✅ {correctCount}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-600 font-semibold">
            ❌ {wrongCount}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-6">
        <motion.div
          className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

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
