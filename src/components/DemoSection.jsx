"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence, useSpring, useTransform, useMotionValue } from "framer-motion";
import { Search, Volume2, ArrowRight, Loader2, BookPlus, RotateCcw, ChevronRight, ChevronLeft, Sparkles, BookOpen, BrainCircuit, CheckCircle2, XCircle } from "lucide-react";

const SAMPLE_WORDS = {
  apple: {
    word: "Apple",
    phonetic: "/ˈæp.əl/",
    pos: "noun",
    meaning: "Quả táo",
    example: "She picked a ripe apple from the tree.",
    exampleVi: "Cô ấy hái một quả táo chín từ cây.",
  },
  resilient: {
    word: "Resilient",
    phonetic: "/rɪˈzɪl.i.ənt/",
    pos: "adjective",
    meaning: "Kiên cường, có khả năng hồi phục",
    example: "She is a resilient woman who overcame many challenges.",
    exampleVi: "Cô ấy là một người phụ nữ kiên cường đã vượt qua nhiều thử thách.",
  },
  serendipity: {
    word: "Serendipity",
    phonetic: "/ˌser.ənˈdɪp.ə.ti/",
    pos: "noun",
    meaning: "Duyên may, điều may mắn bất ngờ",
    example: "Meeting her was pure serendipity – I wasn't even supposed to be at the party.",
    exampleVi: "Gặp cô ấy hoàn toàn là duyên may – tôi thậm chí không có kế hoạch đến bữa tiệc.",
  },
  ephemeral: {
    word: "Ephemeral",
    phonetic: "/ɪˈfem.ər.əl/",
    pos: "adjective",
    meaning: "Phù du, tồn tại trong thời gian ngắn",
    example: "The beauty of cherry blossoms is ephemeral.",
    exampleVi: "Vẻ đẹp của hoa anh đào thật phù du.",
  },
  ubiquitous: {
    word: "Ubiquitous",
    phonetic: "/juːˈbɪk.wɪ.təs/",
    pos: "adjective",
    meaning: "Có mặt ở khắp nơi",
    example: "Smartphones have become ubiquitous in modern life.",
    exampleVi: "Điện thoại thông minh đã trở nên phổ biến khắp nơi trong cuộc sống hiện đại.",
  },
};

const FLASHCARD_DECK = Object.values(SAMPLE_WORDS);
const SUGGESTIONS = Object.keys(SAMPLE_WORDS);

const QUIZ_QUESTIONS = [
  {
    question: "Từ nào dưới đây có nghĩa là 'Kiên cường, có khả năng hồi phục'?",
    options: ["Ephemeral", "Resilient", "Ubiquitous", "Serendipity"],
    answer: 1,
  },
  {
    question: "Điền vào chỗ trống: Meeting her was pure _____ – I wasn't even supposed to be at the party.",
    options: ["Serendipity", "Apple", "Ubiquitous", "Resilient"],
    answer: 0,
  },
  {
    question: "Từ 'Ephemeral' thuộc từ loại gì?",
    options: ["Danh từ (Noun)", "Động từ (Verb)", "Tính từ (Adjective)", "Trạng từ (Adverb)"],
    answer: 2,
  },
  {
    question: "Từ nào mô tả một thứ 'Có mặt ở khắp mọi nơi' (như điện thoại thông minh ngày nay)?",
    options: ["Apple", "Ephemeral", "Resilient", "Ubiquitous"],
    answer: 3,
  }
];

export default function DemoSection() {
  const [activeTab, setActiveTab] = useState("search"); // 'search' | 'flashcard' | 'quiz'

  // Search State
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Flashcard State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz State
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const speak = (text, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (typeof window === "undefined" || !window.speechSynthesis) {
      console.warn("Speech Synthesis not supported");
      return;
    }
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // Parallax Setup
  const containerRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const springConfig = { damping: 25, stiffness: 150 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), springConfig);

  const handleSearch = useCallback(
    (searchTerm) => {
      const term = (searchTerm || query).trim().toLowerCase();
      if (!term) return;

      setLoading(true);
      setResult(null);
      setError("");

      setTimeout(() => {
        const found = SAMPLE_WORDS[term];
        if (found) {
          setResult(found);
          // Tự động đọc từ khi tìm thấy
          speak(found.word);
        } else {
          setError(`Không tìm thấy từ "${term}". Thử: apple, resilient, serendipity, ephemeral, ubiquitous`);
        }
        setLoading(false);
      }, 800);
    },
    [query]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  // Flashcard Navigation
  const nextCard = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % FLASHCARD_DECK.length);
  };

  const prevCard = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + FLASHCARD_DECK.length) % FLASHCARD_DECK.length);
  };

  const activeWord = FLASHCARD_DECK[currentIndex];

  // Quiz Handling
  const handleAnswerSelect = (optIndex) => {
    if (selectedAnswer !== null) return; // Đã trả lời
    setSelectedAnswer(optIndex);
    
    if (optIndex === QUIZ_QUESTIONS[quizIndex].answer) {
      setQuizScore(prev => prev + 1);
    }
    
    // Auto next sau 1.5s
    setTimeout(() => {
      if (quizIndex < QUIZ_QUESTIONS.length - 1) {
        setQuizIndex(prev => prev + 1);
        setSelectedAnswer(null);
      } else {
        setQuizFinished(true);
      }
    }, 1500);
  };

  const resetQuiz = () => {
    setQuizIndex(0);
    setSelectedAnswer(null);
    setQuizScore(0);
    setQuizFinished(false);
  };

  return (
    <section 
      id="demo" 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="py-24 relative overflow-hidden bg-transparent perspective-[1000px]"
    >
      <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[150px] -translate-y-1/2 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <span className="inline-block px-5 py-2 rounded-full bg-white/50 dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 text-secondary-600 dark:text-secondary-400 text-sm font-bold mb-6 tracking-wide shadow-sm">
            TRẢI NGHIỆM THỰC TẾ
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white mb-6 tracking-tight">
            Thử nghiệm <span className="bg-gradient-to-r from-secondary-500 to-primary-500 bg-clip-text text-transparent">tính năng</span>
          </h2>
          <p className="text-xl text-gray-500 dark:text-slate-400 max-w-2xl mx-auto font-medium">
            Trải nghiệm hệ thống tra cứu AI, Flashcard mượt mà và các bài Quiz thông minh.
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex justify-center mb-12 relative z-20">
          <div className="inline-flex flex-wrap justify-center gap-1 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl p-1.5 border border-gray-200 dark:border-white/10 shadow-sm max-w-full">
            <button
              onClick={() => setActiveTab("search")}
              className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === "search" 
                  ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-md" 
                  : "text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Search className="w-4 h-4" /> Tra Từ AI
            </button>
            <button
              onClick={() => setActiveTab("flashcard")}
              className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === "flashcard" 
                  ? "bg-white dark:bg-slate-700 text-secondary-600 dark:text-secondary-400 shadow-md" 
                  : "text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <BookOpen className="w-4 h-4" /> Flashcard
            </button>
            <button
              onClick={() => setActiveTab("quiz")}
              className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === "quiz" 
                  ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-md" 
                  : "text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <BrainCircuit className="w-4 h-4" /> Quiz Trắc nghiệm
            </button>
          </div>
        </div>

        {/* 3D Container */}
        <motion.div
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-3xl mx-auto relative transform-gpu"
        >
          {activeTab === "search" && (
            <motion.div
              key="search-mode"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <div
                style={{ transform: "translateZ(30px)" }}
                className={`flex items-center gap-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border-2 px-6 py-5 shadow-2xl transition-all duration-500 ${
                  query
                    ? "border-primary-400 dark:border-primary-500/50 shadow-primary-500/20"
                    : "border-gray-200/50 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
                }`}
              >
                <Search className="w-6 h-6 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nhập từ vựng (vd: apple, resilient...)"
                  className="flex-1 text-lg text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none bg-transparent font-medium"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSearch()}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary-500/30 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Tìm kiếm
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </div>

              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-3 mt-6 justify-center" style={{ transform: "translateZ(20px)" }}>
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={s}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => {
                      setQuery(s);
                      handleSearch(s);
                    }}
                    className="px-4 py-2 text-sm font-medium bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-300 rounded-xl hover:bg-primary-500 hover:text-white dark:hover:bg-primary-500 dark:hover:text-white hover:border-primary-500 dark:hover:border-primary-500 transition-all capitalize cursor-pointer shadow-sm"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>

              {/* Result Area */}
              <div className="mt-8 min-h-[200px]" style={{ transform: "translateZ(40px)" }}>
                <AnimatePresence mode="wait">
                  {loading && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-3xl border border-gray-200/50 dark:border-white/10 p-8 shadow-xl space-y-6"
                    >
                      <div className="flex items-center gap-4">
                        <div className="skeleton bg-gray-200 dark:bg-slate-700 h-10 w-40 rounded-lg" />
                        <div className="skeleton bg-gray-200 dark:bg-slate-700 h-6 w-24 rounded-full" />
                      </div>
                      <div className="skeleton bg-gray-200 dark:bg-slate-700 h-5 w-48 rounded-md" />
                      <div className="h-px w-full bg-gray-200 dark:bg-slate-700/50" />
                      <div className="skeleton bg-gray-200 dark:bg-slate-700 h-5 w-full rounded-md" />
                      <div className="skeleton bg-gray-200 dark:bg-slate-700 h-5 w-5/6 rounded-md" />
                    </motion.div>
                  )}

                  {result && !loading && (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, rotateX: -15, y: 40, scale: 0.9 }}
                      animate={{ opacity: 1, rotateX: 0, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
                      className="bg-white dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl dark:shadow-[0_0_50px_rgba(59,130,246,0.15)] overflow-hidden transform-gpu"
                    >
                      <div className="px-8 pt-8 pb-6 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-700/50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 dark:bg-primary-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                        <div className="flex items-start justify-between relative z-10">
                          <div>
                            <div className="flex items-center gap-4 mb-2">
                              <h3 className="text-4xl font-extrabold text-gray-900 dark:text-white">
                                {result.word}
                              </h3>
                              <span className="px-3 py-1 text-sm font-bold bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400 rounded-lg">
                                {result.pos}
                              </span>
                            </div>
                            <p className="text-lg text-gray-500 dark:text-slate-400 font-mono">
                              {result.phonetic}
                            </p>
                          </div>
                          <button 
                            onClick={(e) => speak(result.word, e)}
                            className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-700 shadow-md border border-gray-200 dark:border-white/10 flex items-center justify-center text-primary-500 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-slate-600 hover:scale-110 transition-all cursor-pointer"
                          >
                            <Volume2 className="w-6 h-6" />
                          </button>
                        </div>
                      </div>

                      <div className="px-8 py-8 space-y-6">
                        <div>
                          <p className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                            Định nghĩa
                          </p>
                          <p className="text-xl font-bold text-gray-800 dark:text-slate-100">
                            {result.meaning}
                          </p>
                        </div>

                        <div className="h-px bg-gray-100 dark:bg-white/5" />

                        <div>
                          <p className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                            Ví dụ thực tế
                          </p>
                          <div className="bg-gray-50 dark:bg-slate-900/50 rounded-2xl px-6 py-5 border-l-4 border-primary-500">
                            <p className="text-lg text-gray-800 dark:text-slate-200 leading-relaxed font-medium mb-2">
                              &ldquo;{result.example}&rdquo;
                            </p>
                            <p className="text-base text-gray-500 dark:text-slate-400">
                              → {result.exampleVi}
                            </p>
                          </div>
                        </div>

                        <div className="pt-4">
                          <motion.a
                            href="/register"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-gradient-to-r from-primary-500 to-purple-600 text-white font-bold text-lg hover:shadow-xl hover:shadow-primary-500/30 transition-all cursor-pointer"
                          >
                            <BookPlus className="w-5 h-5" />
                            Lưu vào bộ sưu tập của bạn
                          </motion.a>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {error && !loading && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20 p-6 shadow-md text-center"
                    >
                      <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {activeTab === "flashcard" && (
            <motion.div
              key="flashcard-mode"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              style={{ transform: "translateZ(40px)" }}
              className="flex flex-col items-center w-full"
            >
              {/* Counter */}
              <div className="mb-4 text-sm font-bold text-gray-500 dark:text-slate-400 bg-white/50 dark:bg-white/5 backdrop-blur-md px-4 py-1.5 rounded-full border border-gray-200 dark:border-white/10 shadow-sm">
                Thẻ {currentIndex + 1} / {FLASHCARD_DECK.length}
              </div>

              {/* Flashcard Component */}
              <div 
                className="w-full h-[350px] sm:h-[400px] relative perspective-[1500px] cursor-pointer"
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <motion.div
                  className="w-full h-full relative preserve-3d"
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                  {/* Front */}
                  <div className="absolute inset-0 backface-hidden bg-white dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl flex flex-col items-center justify-center p-8">
                    <Sparkles className="absolute top-6 left-6 w-8 h-8 text-secondary-400 opacity-20" />
                    
                    {/* Nút đọc trên thẻ (phải chặn sự kiện lật thẻ khi bấm nút này) */}
                    <button 
                      type="button"
                      onClick={(e) => speak(activeWord.word, e)}
                      className="absolute top-6 right-6 p-3 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors z-20 cursor-pointer"
                    >
                      <Volume2 className="w-6 h-6 text-gray-400 dark:text-slate-400 hover:text-primary-500 transition-colors pointer-events-none" />
                    </button>
                    
                    <h3 className="text-5xl sm:text-6xl font-black text-gray-900 dark:text-white mb-4 text-center">
                      {activeWord.word}
                    </h3>
                    <p className="text-xl sm:text-2xl text-gray-500 dark:text-slate-400 font-mono">
                      {activeWord.phonetic}
                    </p>
                    
                    <div className="absolute bottom-6 flex items-center gap-2 text-sm text-gray-400 dark:text-slate-500 font-medium animate-pulse">
                      <RotateCcw className="w-4 h-4" /> Chạm để lật
                    </div>
                  </div>

                  {/* Back */}
                  <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-secondary-500 to-primary-600 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center justify-center p-8 text-white text-center">
                    <button 
                      type="button"
                      onClick={(e) => speak(activeWord.word, e)}
                      className="absolute top-6 right-6 p-3 rounded-full hover:bg-white/10 transition-colors z-20 cursor-pointer"
                    >
                      <Volume2 className="w-6 h-6 text-white/80 hover:text-white transition-colors pointer-events-none" />
                    </button>

                    <span className="px-3 py-1 text-xs font-bold bg-white/20 rounded-lg mb-4 uppercase tracking-widest">
                      {activeWord.pos}
                    </span>
                    <h3 className="text-3xl sm:text-4xl font-bold mb-6">
                      {activeWord.meaning}
                    </h3>
                    
                    <div className="bg-black/20 rounded-2xl p-4 sm:p-6 w-full mt-2 backdrop-blur-md">
                      <p className="text-base sm:text-lg italic mb-2">"{activeWord.example}"</p>
                      <p className="text-xs sm:text-sm text-white/70">{activeWord.exampleVi}</p>
                    </div>

                    <div className="absolute bottom-6 flex items-center gap-2 text-sm text-white/60 font-medium">
                      <RotateCcw className="w-4 h-4" /> Chạm để úp
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Controls */}
              <div 
                className="flex items-center gap-4 mt-8 relative z-50"
                style={{ transform: "translateZ(50px)" }}
              >
                <button
                  type="button"
                  onClick={prevCard}
                  className="w-14 h-14 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-slate-700 hover:scale-105 transition-all text-gray-600 dark:text-slate-300 cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6 pointer-events-none" />
                </button>
                <a
                  href="/register"
                  className="px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-bold shadow-xl hover:scale-105 transition-all"
                >
                  Học thêm từ mới
                </a>
                <button
                  type="button"
                  onClick={nextCard}
                  className="w-14 h-14 rounded-full bg-secondary-500 border border-transparent shadow-lg shadow-secondary-500/30 flex items-center justify-center hover:bg-secondary-600 hover:scale-105 transition-all text-white cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6 pointer-events-none" />
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === "quiz" && (
            <motion.div
              key="quiz-mode"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              style={{ transform: "translateZ(30px)" }}
              className="w-full"
            >
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl p-8 sm:p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 dark:bg-rose-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                
                {!quizFinished ? (
                  <div className="relative z-10">
                    <div className="flex justify-between items-center mb-8 border-b border-gray-100 dark:border-white/5 pb-4">
                      <div className="text-sm font-bold text-gray-500 dark:text-slate-400">
                        Câu {quizIndex + 1} / {QUIZ_QUESTIONS.length}
                      </div>
                      <div className="text-sm font-bold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-3 py-1 rounded-full">
                        Score: {quizScore}
                      </div>
                    </div>

                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 leading-relaxed">
                      {QUIZ_QUESTIONS[quizIndex].question}
                    </h3>

                    <div className="space-y-3">
                      {QUIZ_QUESTIONS[quizIndex].options.map((opt, i) => {
                        const isSelected = selectedAnswer === i;
                        const isCorrect = i === QUIZ_QUESTIONS[quizIndex].answer;
                        const showCorrect = selectedAnswer !== null && isCorrect;
                        const showWrong = isSelected && !isCorrect;

                        return (
                          <button
                            key={i}
                            onClick={() => handleAnswerSelect(i)}
                            disabled={selectedAnswer !== null}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border-2 text-left font-semibold transition-all duration-300 ${
                              showCorrect
                                ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-400 dark:border-emerald-500/50 text-emerald-700 dark:text-emerald-400"
                                : showWrong
                                ? "bg-red-50 dark:bg-red-500/10 border-red-400 dark:border-red-500/50 text-red-700 dark:text-red-400"
                                : "bg-white dark:bg-slate-700 border-gray-200 dark:border-white/10 text-gray-700 dark:text-slate-200 hover:border-rose-400 dark:hover:border-rose-500/50 hover:bg-gray-50 dark:hover:bg-slate-600 cursor-pointer"
                            }`}
                          >
                            <span>{opt}</span>
                            {showCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                            {showWrong && <XCircle className="w-5 h-5 text-red-500" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="relative z-10 text-center py-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-rose-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-rose-500/30">
                      <BrainCircuit className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Hoàn thành!</h3>
                    <p className="text-lg text-gray-500 dark:text-slate-400 mb-8">
                      Bạn trả lời đúng <strong className="text-rose-500">{quizScore}/{QUIZ_QUESTIONS.length}</strong> câu hỏi.
                    </p>
                    <div className="flex gap-4 justify-center">
                      <button
                        onClick={resetQuiz}
                        className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-white font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                      >
                        Thử lại
                      </button>
                      <a
                        href="/register"
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold shadow-lg hover:shadow-xl transition-all"
                      >
                        Học tiếp trên App
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </motion.div>
      </div>
    </section>
  );
}
