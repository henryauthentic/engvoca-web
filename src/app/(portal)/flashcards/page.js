"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  RotateCcw,
  Loader2,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Zap,
  Target,
  Brain,
  Star,
  Play,
  ArrowRight,
  BookOpen,
  ClipboardCheck,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import {
  getWordsByTopic,
  getTopics,
  getUserStats,
  reviewWord,
  savePracticeResult,
  getWordsToReviewToday,
  getWordProgress,
  getWordsByIds,
  updateStreakAfterStudy,
} from "@/lib/firestoreService";
import { countByStatus, getStatusDisplay, filterDifficultWords } from "@/mappers/wordProgressMapper";
import { speak } from "@/lib/tts";
import { getUnsplashImage } from "@/lib/unsplashAPI";
import { lookupWord } from "@/lib/dictionaryAPI";
import TopicSelector from "@/components/portal/TopicSelector";

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

const CARD_AMOUNTS = [
  { label: "Nhanh", value: 10, icon: "⚡" },
  { label: "Chuẩn", value: 20, icon: "🎯" },
  { label: "Trung bình", value: 30, icon: "🔥" },
  { label: "Nặng", value: 50, icon: "💪" },
];

export default function FlashcardsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTopic = searchParams.get("topic");
  const modeParam = searchParams.get("mode");
  const { user } = useAuth();

  const parentScrollRef = useRef(null);
  const childScrollRef = useRef(null);

  // Phases: lobby -> playing -> results
  const [phase, setPhase] = useState("lobby");
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [parentTopics, setParentTopics] = useState([]);
  const [allChildTopics, setAllChildTopics] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState(null);
  const [selectedTopicId, setSelectedTopicId] = useState(preselectedTopic || "");
  const [globalProgressMap, setGlobalProgressMap] = useState({});
  const [selectedTopicWords, setSelectedTopicWords] = useState([]);
  
  // Lobby User Settings
  const [cardCount, setCardCount] = useState(20);

  // Playing States
  const [deck, setDeck] = useState([]);
  const [topicName, setTopicName] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState([]);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [sessionXp, setSessionXp] = useState(0);
  const [isRating, setIsRating] = useState(false);
  
  // Rich data states
  const [unsplashImage, setUnsplashImage] = useState(null);
  const [dictData, setDictData] = useState(null);

  // Load Initial Data (Topics & Global Progress)
  useEffect(() => {
    async function loadData() {
      if (!user?.uid) return;
      try {
        if (modeParam === "review" || modeParam === "difficult") {
          // Direct bypass to playing phase handled later, just load progress to be safe
          const rawProgress = await getWordProgress(user.uid);
          const pMap = {};
          for (const doc of rawProgress) pMap[doc.wordId || doc.id] = doc;
          setGlobalProgressMap(pMap);
        }

        const [allTopicsData, rawProgress] = await Promise.all([
          getTopics(),
          getWordProgress(user.uid),
        ]);
        
        const pMap = {};
        for (const doc of rawProgress) pMap[doc.wordId || doc.id] = doc;
        setGlobalProgressMap(pMap);

        const parents = allTopicsData.filter((t) => !t.parent_id);
        const children = allTopicsData.filter((t) => t.parent_id);

        setParentTopics(parents);
        setAllChildTopics(children);

        if (parents.length > 0) {
          const parentToSelect = preselectedTopic 
            ? parents.find(p => String(p.id) === String(preselectedTopic)) 
            : null;
            
          const activeParent = parentToSelect || parents[0];
          setSelectedParentId(activeParent.id);
          
          const firstChildren = children.filter((c) => c.parent_id === activeParent.id);
          if (firstChildren.length > 0 && !preselectedTopic) {
             // If no preselected child, pick first child of active parent
            setSelectedTopicId(firstChildren[0].id);
          } else if (preselectedTopic) {
             // If preselected is a parent, pick its first child. If it's a child, keep it.
             const isParent = parents.some(p => p.id === preselectedTopic);
             if (isParent && firstChildren.length > 0) setSelectedTopicId(firstChildren[0].id);
             else setSelectedTopicId(preselectedTopic);
          }
        }

        // Direct Launch Modes
        if (modeParam === "review") {
          const progressWords = await getWordsToReviewToday(user.uid);
          const wordIds = progressWords.map(w => w.word_id || w.id);
          const fullWords = await getWordsByIds(wordIds);
          setTopicName("Ôn tập đến hạn");
          setDeck(fullWords.sort(() => Math.random() - 0.5));
          setCurrentIndex(0);
          setFlipped(false);
          setResults([]);
          setSessionXp(0);
          setPhase("playing");
          return;
        }

        if (modeParam === "difficult") {
          const filtered = filterDifficultWords(rawProgress);
          const wordIds = filtered.map(w => w.wordId).filter(Boolean);
          const fullWords = await getWordsByIds(wordIds);
          setTopicName("Từ khó cần ôn");
          setDeck(fullWords.sort(() => Math.random() - 0.5));
          setCurrentIndex(0);
          setFlipped(false);
          setResults([]);
          setSessionXp(0);
          setPhase("playing");
          return;
        }

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user, preselectedTopic, modeParam]);

  // Load words when topic changes (for preview and stats)
  useEffect(() => {
    async function loadTopicWords() {
      if (!selectedTopicId || phase !== "lobby") return;
      try {
        const words = await getWordsByTopic(selectedTopicId);
        setSelectedTopicWords(words);
      } catch (e) {
        console.error(e);
      }
    }
    loadTopicWords();
  }, [selectedTopicId, phase]);

  const allTopicsInParent = allChildTopics.filter((t) => t.parent_id === selectedParentId);
  const selectedTopic = allChildTopics.find((t) => t.id === selectedTopicId);

  // Global Stats calculation
  const globalStatusCounts = countByStatus(Object.values(globalProgressMap));
  const globalTotal = Object.keys(globalProgressMap).length;
  
  // Selected Topic Stats calculation
  const topicLearnedCount = selectedTopicWords.filter(w => {
    const p = globalProgressMap[w.id];
    return p && p.status > 0; // learning or mastered
  }).length;
  const topicTotalCount = selectedTopicWords.length;
  const topicProgressPct = topicTotalCount > 0 ? Math.round((topicLearnedCount / topicTotalCount) * 100) : 0;

  // Auto-speak khi chuyển thẻ
  useEffect(() => {
    if (phase === "playing" && autoSpeak && deck[currentIndex] && !flipped) {
      speak(deck[currentIndex].word);
    }
  }, [currentIndex, flipped, phase, autoSpeak, deck]);

  // Load rich data (Unsplash + Dictionary) khi chuyển thẻ
  useEffect(() => {
    if (phase !== "playing" || !deck[currentIndex]) return;
    
    const wordText = deck[currentIndex].word;
    let isMounted = true;
    
    setUnsplashImage(null);
    setDictData(null);
    
    getUnsplashImage(wordText).then((img) => {
      if (isMounted && img) setUnsplashImage(img);
    });
    
    lookupWord(wordText).then((data) => {
      if (isMounted && data) setDictData(data);
    });
    
    if (deck[currentIndex + 1]) {
       getUnsplashImage(deck[currentIndex + 1].word);
    }
    
    return () => { isMounted = false; };
  }, [currentIndex, phase, deck]);

  const currentCard = deck[currentIndex];
  const progress = deck.length > 0 ? ((currentIndex + 1) / deck.length) * 100 : 0;

  // ========= START =========
  const startFlashcards = async () => {
    if (!selectedTopicId) return;
    setLoading(true);
    try {
      const words = selectedTopicWords.length > 0 ? selectedTopicWords : await getWordsByTopic(selectedTopicId);
      setTopicName(selectedTopic?.name || "Flashcard");
      const shuffled = [...words].sort(() => Math.random() - 0.5);
      
      const actualCount = cardCount === "all" ? shuffled.length : cardCount;
      setDeck(shuffled.slice(0, actualCount));
      setCurrentIndex(0);
      setFlipped(false);
      setResults([]);
      setSessionXp(0);
      setPhase("playing");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const flipCard = useCallback(() => {
    setFlipped((f) => !f);
    if (!flipped && currentCard && autoSpeak) {
      speak(currentCard.word);
    }
  }, [flipped, currentCard, autoSpeak]);

  const handleRate = async (quality) => {
    if (isRating || !user?.uid) return;
    setIsRating(true);

    const xpGained = quality >= 3 ? 5 : 1;
    setSessionXp((prev) => prev + xpGained);

    // ✅ Resolve parentTopicId for safe topic progress tracking
    const cardTopicId = currentCard.topic_id || currentCard.a_topic_id;
    const directTopic = allChildTopics.find(t => t.id === cardTopicId);
    const parentTopicId = directTopic?.parent_id || selectedParentId || cardTopicId;
    
    reviewWord(user.uid, currentCard.id, quality, parentTopicId).catch(console.error);

    setResults((prev) => [
      ...prev,
      { word: currentCard.word, quality, xp: xpGained },
    ]);
    setFlipped(false);

    setTimeout(() => {
      if (currentIndex < deck.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setPhase("results");
        const correct = [...results, { quality }].filter((r) => r.quality >= 3).length;
        savePracticeResult(user.uid, correct, deck.length, sessionXp + xpGained).catch(console.error);
        // ✅ Update streak once per session (not per word)
        updateStreakAfterStudy(user.uid).catch(console.error);
      }
      setIsRating(false);
    }, 300);
  };

  const prevCard = () => {
    if (currentIndex > 0) { setCurrentIndex((p) => p - 1); setFlipped(false); }
  };
  const nextCard = () => {
    if (currentIndex < deck.length - 1) { setCurrentIndex((p) => p + 1); setFlipped(false); }
    else { setPhase("results"); }
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e) => {
      if (e.key === "ArrowLeft") { prevCard(); e.preventDefault(); }
      else if (e.key === "ArrowRight") { nextCard(); e.preventDefault(); }
      else if (e.key === " " || e.key === "Enter") { flipCard(); e.preventDefault(); }
      else if (flipped && e.key === "1") { handleRate(0); }
      else if (flipped && e.key === "2") { handleRate(3); }
      else if (flipped && e.key === "3") { handleRate(4); }
      else if (flipped && e.key === "4") { handleRate(5); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, flipped, currentIndex, deck.length]);

  const resetDeck = () => {
    setPhase("lobby");
    setResults([]);
    setSessionXp(0);
  };

  const scrollToCategories = () => {
    document.getElementById('category-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  // ==============================
  //  LOADING
  // ==============================
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
          <span>Đang tải...</span>
        </div>
      </div>
    );
  }

  // ==============================
  //  LOBBY - Đã thiết kế lại
  // ==============================
  if (phase === "lobby") {
    return (
      <div className="max-w-6xl mx-auto pb-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="mb-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-2xl shadow-inner">
              📝
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">Flashcard Review</h1>
              <p className="text-sm text-gray-500 font-medium">Ôn tập từ vựng với thẻ ghi nhớ. Học ít mỗi ngày, nhớ lâu mỗi ngày.</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-6 mb-8">
            {/* Left Col: Main CTA */}
            <div className="lg:col-span-7">
              <div className="h-full rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 p-6 sm:p-8 text-white relative overflow-hidden shadow-xl shadow-primary-500/20">
                {/* Decorative background circle */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-white/80 font-bold text-xs uppercase tracking-wider mb-2">
                      <Zap className="w-4 h-4" /> Tiếp tục học
                    </div>
                    <h2 className="text-3xl font-extrabold mb-2">Chủ đề: {selectedTopic?.name || "Chọn chủ đề"}</h2>
                    <p className="text-white/90 text-sm font-medium mb-6">Bạn đang học: {topicLearnedCount} / {topicTotalCount} từ</p>
                    
                    <div className="w-full h-3 bg-black/20 rounded-full overflow-hidden mb-8">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${topicProgressPct}%` }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="h-full bg-white rounded-full relative"
                      >
                         <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/50 animate-pulse"></div>
                      </motion.div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={startFlashcards}
                      disabled={!selectedTopicId}
                      className="flex-1 py-3.5 bg-white text-primary-600 rounded-xl font-extrabold text-base hover:bg-gray-50 hover:scale-[1.02] transition-all cursor-pointer shadow-lg flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      🚀 Bắt đầu học ngay
                    </button>
                    <button
                      onClick={scrollToCategories}
                      className="py-3.5 px-6 bg-white/10 border border-white/20 text-white rounded-xl font-bold text-sm hover:bg-white/20 transition-all cursor-pointer flex justify-center items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" /> Đổi chủ đề
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Quick Stats & Info */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Quick stats grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="portal-card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-foreground">{globalTotal}</p>
                    <p className="text-[11px] text-gray-500 font-medium">Tổng từ</p>
                  </div>
                </div>
                <div className="portal-card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-foreground">{globalStatusCounts.mastered}</p>
                    <p className="text-[11px] text-gray-500 font-medium">Thuộc</p>
                  </div>
                </div>
                <div className="portal-card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-foreground">{globalStatusCounts.learning + globalStatusCounts.reviewing}</p>
                    <p className="text-[11px] text-gray-500 font-medium">Đang học</p>
                  </div>
                </div>
                <div className="portal-card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-500">
                    <Star className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-foreground">{globalStatusCounts.newWords}</p>
                    <p className="text-[11px] text-gray-500 font-medium">Từ mới</p>
                  </div>
                </div>
              </div>

              {/* SM-2 Info Card */}
              <div className="portal-card p-5 flex-1 flex flex-col justify-center bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-indigo-100">
                 <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Brain className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-indigo-900 mb-1">Học thông minh với thuật toán SM-2</h3>
                      <p className="text-xs text-indigo-700/70 mb-3 leading-relaxed">Tối ưu hóa việc ghi nhớ dựa trên khả năng của bạn. Từ khó lặp lại nhiều, từ dễ lặp lại ít.</p>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-md border border-indigo-100 shadow-sm">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs font-bold text-indigo-900">+5 XP <span className="font-medium text-gray-500">mỗi từ đúng</span></span>
                      </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>

          <div id="category-section" className="mb-6 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-gray-400" />
            <h3 className="text-base font-bold text-foreground">1. Chọn chủ đề</h3>
          </div>

          {/* CHỌN CHỦ ĐỀ */}
          <TopicSelector
            parentTopics={parentTopics}
            selectedParentId={selectedParentId}
            onSelectParent={(id) => {
              setSelectedParentId(id);
              const children = allChildTopics.filter((c) => c.parent_id === id);
              if (children.length > 0) setSelectedTopicId(children[0].id);
            }}
            childTopics={allTopicsInParent}
            selectedTopicId={selectedTopicId}
            onSelectTopic={setSelectedTopicId}
            className="mb-8"
          />

          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Left: Settings */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-gray-400" />
                <h3 className="text-base font-bold text-foreground">2. Chọn số lượng thẻ</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                {CARD_AMOUNTS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setCardCount(opt.value)}
                    className={`py-3 px-2 rounded-xl text-center transition-all border-2 cursor-pointer ${
                      cardCount === opt.value
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-border-color bg-surface text-gray-600 hover:border-primary-200"
                    }`}
                  >
                    <div className="text-lg mb-1">{opt.icon}</div>
                    <div className="text-[11px] font-bold">{opt.label}</div>
                    <div className="text-[9px] text-gray-400">{opt.value} từ</div>
                  </button>
                ))}
                <button
                  onClick={() => setCardCount("all")}
                  className={`col-span-2 sm:col-span-4 mt-1 py-3 px-2 rounded-xl text-center transition-all border-2 cursor-pointer ${
                    cardCount === "all"
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-border-color bg-surface text-gray-600 hover:border-primary-200"
                  }`}
                >
                  <div className="text-[12px] font-bold flex items-center justify-center gap-2">
                    📚 Luyện tập tất cả từ trong chủ đề ({topicTotalCount} từ)
                  </div>
                </button>
              </div>

              {/* Estimation */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-center justify-between text-blue-900">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-blue-600/70 font-bold uppercase tracking-wider mb-0.5">Dự kiến phiên học</p>
                    <p className="text-xs font-semibold">Tối đa {cardCount === "all" ? topicTotalCount : cardCount} thẻ</p>
                  </div>
                </div>
                <div className="h-8 w-px bg-blue-200"></div>
                <div className="text-center">
                  <p className="text-[10px] text-blue-600/70 font-bold uppercase tracking-wider mb-0.5">Thời gian ước tính</p>
                  <p className="text-xs font-semibold">~{Math.max(1, Math.round((cardCount === "all" ? topicTotalCount : cardCount) * 0.15))} phút</p>
                </div>
                <div className="h-8 w-px bg-blue-200 hidden sm:block"></div>
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-blue-600/70 font-bold uppercase tracking-wider mb-0.5">Tỷ lệ ghi nhớ</p>
                  <p className="text-xs font-semibold">~85%</p>
                </div>
              </div>
            </div>

            {/* Right: Preview */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-gray-400" />
                <h3 className="text-base font-bold text-foreground">3. Xem trước nội dung</h3>
              </div>
              
              <div className="portal-card p-5 h-[230px] flex flex-col bg-gray-50/50">
                {selectedTopicWords.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mb-2" />
                    <p className="text-xs">Đang tải từ vựng...</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-auto">
                      {selectedTopicWords.slice(0, 4).map(w => (
                        <div key={w.id} className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm text-center">
                          <p className="text-sm font-bold text-foreground truncate">{w.word}</p>
                          <p className="text-[10px] text-gray-500 truncate mt-0.5">{w.meaning}</p>
                        </div>
                      ))}
                    </div>
                    {selectedTopicWords.length > 4 && (
                      <div className="text-center mt-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-500 rounded-full text-xs font-semibold">
                          ... và {selectedTopicWords.length - 4} từ khác
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Final CTA */}
          <div className="sticky bottom-6 z-20">
            <button
              onClick={startFlashcards}
              disabled={!selectedTopicId}
              className="w-full py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-2xl font-extrabold text-lg hover:from-primary-600 hover:to-secondary-600 transition-all cursor-pointer shadow-xl shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              🚀 Bắt đầu học {cardCount === "all" ? topicTotalCount : cardCount} từ
            </button>
            <p className="text-center text-[10px] text-gray-400 font-medium mt-3">
              Bạn có thể thay đổi chủ đề hoặc số lượng thẻ bất cứ lúc nào.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ==============================
  //  PLAYING
  // ==============================
  if (phase === "playing") {
    if (deck.length === 0) {
      return (
        <div className="max-w-2xl mx-auto text-center py-20">
          <p className="text-xl font-bold text-foreground mb-4">Không tìm thấy từ vựng nào.</p>
          <button onClick={resetDeck} className="px-6 py-2 bg-primary-500 text-white rounded-xl">Quay lại</button>
        </div>
      );
    }

    const estimatedMinsLeft = Math.max(1, Math.round(((deck.length - currentIndex) * 15) / 60));
    const correctCount = results.filter(r => r.quality >= 3).length;
    const incorrectCount = results.filter(r => r.quality < 3).length;

    return (
      <div className="max-w-4xl mx-auto min-h-[calc(100vh-6rem)] flex flex-col">
        {/* Header playing */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <button onClick={resetDeck} className="p-2.5 rounded-xl bg-surface border border-border-color hover:bg-gray-50 text-gray-500 cursor-pointer transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary-500" />
                  Từ vựng tiếng Anh theo chủ đề
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Lật thẻ để xem nghĩa và ví dụ</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
               <div className="flex items-center gap-1.5 text-primary-600">
                  Thẻ {currentIndex + 1} / {deck.length}
               </div>
               <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                  ~{estimatedMinsLeft} phút còn lại 🕒
               </div>
               <button onClick={() => setAutoSpeak(!autoSpeak)} className={`p-2 rounded-full transition-colors cursor-pointer ${autoSpeak ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-400'}`}>
                 {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
               </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-primary-500 to-indigo-500 rounded-full" animate={{ width: `${progress}%` }} />
             </div>
             <div className="flex gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">✔ {correctCount} đúng</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">✖ {incorrectCount} sai</span>
             </div>
          </div>
        </div>

        {/* Flashcard Area */}
        <div className="flex-1 flex flex-col justify-center items-center pb-8 perspective-1000 w-full">
           <AnimatePresence mode="wait">
             <motion.div
               key={currentIndex}
               initial={{ opacity: 0, x: 20, rotateY: flipped ? 180 : 0 }}
               animate={{ opacity: 1, x: 0, rotateY: flipped ? 180 : 0 }}
               exit={{ opacity: 0, x: -20, rotateY: flipped ? 180 : 0 }}
               transition={{ duration: 0.4 }}
               className="relative w-full max-w-3xl aspect-[4/5] sm:aspect-[16/10] md:aspect-[21/10] cursor-pointer"
               onClick={flipCard}
               style={{ transformStyle: "preserve-3d" }}
             >
                {/* FRONT */}
                <div 
                  className={`absolute inset-0 flex flex-col items-center justify-center p-8 portal-card bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 rounded-3xl ${flipped ? 'pointer-events-none' : ''}`}
                  style={{ backfaceVisibility: "hidden" }}
                >
                   <div className="absolute top-8 text-center w-full px-6">
                     <p className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-full">
                       💡 Bạn nhớ nghĩa của từ này không?
                     </p>
                   </div>
                   
                   <div className="flex flex-col items-center">
                     <p className="text-5xl sm:text-7xl font-extrabold text-slate-800 mb-4 tracking-tight">{currentCard.word}</p>
                     <p className="text-lg text-primary-600 font-medium italic mb-6">
                       {currentCard.pronunciation ? `/${currentCard.pronunciation}/` : "—"}
                     </p>
                     <button onClick={(e) => { e.stopPropagation(); speak(currentCard.word); }} className="w-14 h-14 rounded-full bg-indigo-50 shadow-sm text-indigo-500 hover:bg-indigo-100 transition-colors flex items-center justify-center group">
                       <Volume2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                     </button>
                   </div>

                   {!flipped && (
                     <div className="absolute bottom-8 flex items-center gap-2 text-sm text-gray-400 font-medium animate-pulse">
                       👆 Chạm để lật thẻ
                     </div>
                   )}
                </div>

                {/* BACK */}
                <div 
                  className={`absolute inset-0 flex flex-col md:flex-row gap-4 sm:gap-6 p-6 sm:p-8 portal-card bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 rounded-3xl overflow-hidden ${!flipped ? 'pointer-events-none' : ''}`}
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                   {unsplashImage && (
                      <div className="w-full md:w-2/5 h-32 md:h-full relative rounded-2xl overflow-hidden shadow-sm border border-gray-100 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={unsplashImage.imageUrl} alt={currentCard.word} className="w-full h-full object-cover" />
                      </div>
                   )}

                   <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col">
                     <div className={`${unsplashImage ? 'md:text-left text-center' : 'text-center'} mb-4 mt-2 md:mt-0`}>
                        <div className="inline-flex items-center gap-2 mb-2 text-primary-600 font-bold bg-primary-50 px-3 py-1.5 rounded-lg">
                          <span className="text-base">{currentCard.word}</span>
                          <button onClick={(e) => { e.stopPropagation(); speak(currentCard.word); }} className="hover:text-primary-800 transition-colors">
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-3xl sm:text-4xl font-extrabold text-slate-800 mb-1">{currentCard.meaning}</p>
                     </div>
                     
                     <div className={`w-16 h-1 bg-gray-100 rounded-full mb-6 ${unsplashImage ? 'mx-auto md:mx-0' : 'mx-auto'}`}></div>

                     {/* Example from DB */}
                     {currentCard.example && (
                       <div className="mb-4 bg-slate-50 rounded-2xl p-4 border-l-4 border-primary-400 shrink-0">
                         <div className="flex items-center gap-2 mb-2">
                           <span className="text-sm">📌</span>
                           <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ví dụ</h4>
                           <button onClick={(e) => { e.stopPropagation(); speak(currentCard.example); }} className="ml-auto p-1.5 rounded-full bg-white text-primary-500 hover:bg-primary-50 transition-colors shadow-sm">
                             <Volume2 className="w-3.5 h-3.5" />
                           </button>
                         </div>
                         <p className="text-sm text-slate-800 font-medium italic">"{currentCard.example}"</p>
                       </div>
                     )}

                     {/* Expandable Section */}
                     {(dictData) && (
                       <details className="group mt-auto shrink-0" onClick={(e) => e.stopPropagation()}>
                         <summary className="text-xs font-bold text-indigo-500 cursor-pointer list-none flex items-center justify-between p-3 bg-indigo-50/50 hover:bg-indigo-50 rounded-xl transition-colors">
                           <span>Xem thêm nghĩa mở rộng...</span>
                           <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
                         </summary>
                         <div className="pt-3 pb-1 px-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            {dictData && dictData.meanings && dictData.meanings[0] && (
                              <div className="space-y-3">
                                {dictData.meanings[0].definitions.slice(0, 2).map((def, idx) => (
                                  <div key={idx} className="text-[13px]">
                                     <p className="text-slate-700 font-medium">{idx + 1}. {def.definition}</p>
                                     {def.example && <p className="text-slate-500 italic mt-1 bg-slate-50 p-1.5 rounded-lg">"{def.example}"</p>}
                                  </div>
                                ))}
                              </div>
                            )}
                         </div>
                       </details>
                     )}
                   </div>
                </div>
             </motion.div>
           </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="h-[120px] max-w-3xl mx-auto w-full px-4 mb-6">
           {flipped ? (() => {
             const getIntervalStr = (quality) => {
               if (!currentCard) return "1d";
               const progress = globalProgressMap[currentCard.id] || { repetition: 0, easinessFactor: 2.5, intervalDays: 0 };
               
               // Anki-style override for new/learning cards to match user expectation
               if (!progress.repetition || progress.repetition === 0) {
                 if (quality === 0) return "Lại ngay";
                 if (quality === 3) return "1 phút";
                 if (quality === 4) return "10 phút";
                 if (quality === 5) return "1 ngày";
               }

               let newInterval = progress.intervalDays || 0;
               if (quality >= 3) {
                 const rep = progress.repetition || 0;
                 if (rep === 0) newInterval = 1;
                 else if (rep === 1) newInterval = 6;
                 else newInterval = Math.round(newInterval * (progress.easinessFactor || 2.5));
               } else {
                 return '1 ngày'; 
               }

               if (newInterval === 0) return "Lại";
               if (newInterval < 30) return `${newInterval} ngày`;
               if (newInterval < 365) return `${Math.round(newInterval / 30)} tháng`;
               return `${Math.round(newInterval / 365)} năm`;
             };

             return (
               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-4 gap-3 sm:gap-4 h-full">
                 <button onClick={() => handleRate(0)} disabled={isRating} className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-b from-red-400 to-red-500 text-white shadow-lg shadow-red-500/20 hover:-translate-y-1 transition-all group disabled:opacity-50">
                   <span className="text-2xl sm:text-3xl drop-shadow-md group-hover:scale-110 transition-transform">😵</span>
                   <span className="text-sm sm:text-base font-extrabold tracking-wide drop-shadow-md">Quên [1]</span>
                   <span className="text-[9px] sm:text-[10px] font-semibold text-red-100">{getIntervalStr(0)}</span>
                 </button>
                 <button onClick={() => handleRate(3)} disabled={isRating} className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-b from-orange-400 to-orange-500 text-white shadow-lg shadow-orange-500/20 hover:-translate-y-1 transition-all group disabled:opacity-50">
                   <span className="text-2xl sm:text-3xl drop-shadow-md group-hover:scale-110 transition-transform">🤔</span>
                   <span className="text-sm sm:text-base font-extrabold tracking-wide drop-shadow-md">Khó [2]</span>
                   <span className="text-[9px] sm:text-[10px] font-semibold text-orange-100">{getIntervalStr(3)}</span>
                 </button>
                 <button onClick={() => handleRate(4)} disabled={isRating} className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:-translate-y-1 transition-all group disabled:opacity-50">
                   <span className="text-2xl sm:text-3xl drop-shadow-md group-hover:scale-110 transition-transform">👍</span>
                   <span className="text-sm sm:text-base font-extrabold tracking-wide drop-shadow-md">Tốt [3]</span>
                   <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-100">{getIntervalStr(4)}</span>
                 </button>
                 <button onClick={() => handleRate(5)} disabled={isRating} className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-b from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:-translate-y-1 transition-all group disabled:opacity-50">
                   <span className="text-2xl sm:text-3xl drop-shadow-md group-hover:scale-110 transition-transform">😎</span>
                   <span className="text-sm sm:text-base font-extrabold tracking-wide drop-shadow-md">Dễ [4]</span>
                   <span className="text-[9px] sm:text-[10px] font-semibold text-blue-100">{getIntervalStr(5)}</span>
                 </button>
               </motion.div>
             );
           })() : (
             <div className="flex justify-center h-full items-center">
               <button onClick={flipCard} className="w-full max-w-sm py-5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-2xl font-extrabold tracking-wide transition-colors uppercase text-sm shadow-sm">
                 Chạm để lật thẻ (Space)
               </button>
             </div>
           )}
        </div>
      </div>
    );
  }

  // ==============================
  //  RESULTS
  // ==============================
  if (phase === "results") {
    const learned = results.filter((r) => r.quality >= 3).length;
    return (
      <div className="max-w-2xl mx-auto pb-10">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="portal-card p-8 text-center shadow-2xl shadow-primary-500/10">
          <div className="text-7xl mb-6">🎉</div>
          <h2 className="text-3xl font-extrabold text-foreground mb-3">Hoàn thành!</h2>
          <p className="text-gray-500 font-medium mb-8">Bạn đã xem {deck.length} từ trong chủ đề <strong className="text-primary-600">{topicName}</strong></p>
          
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="portal-card p-4 sm:p-6 text-center border border-emerald-100 bg-emerald-50/30">
              <p className="text-3xl font-extrabold text-emerald-500 mb-1">{learned}</p>
              <p className="text-xs font-bold text-gray-500 uppercase">Đã thuộc</p>
            </div>
            <div className="portal-card p-4 sm:p-6 text-center border border-amber-100 bg-amber-50/30">
              <p className="text-3xl font-extrabold text-amber-500 mb-1">{results.length - learned}</p>
              <p className="text-xs font-bold text-gray-500 uppercase">Cần ôn lại</p>
            </div>
            <div className="portal-card p-4 sm:p-6 text-center border border-primary-100 bg-primary-50/30">
              <p className="text-3xl font-extrabold text-primary-500 mb-1">+{sessionXp}</p>
              <p className="text-xs font-bold text-gray-500 uppercase">XP Nhận được</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={resetDeck} className="py-3.5 px-8 bg-surface border-2 border-border-color text-foreground rounded-xl font-bold hover:border-primary-300 hover:bg-gray-50 transition-all cursor-pointer">
              ← Chọn chủ đề khác
            </button>
            <button onClick={startFlashcards} className="py-3.5 px-8 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl font-extrabold hover:from-primary-600 hover:to-secondary-600 transition-all cursor-pointer shadow-lg shadow-primary-500/30">
              Học tiếp chủ đề này 🚀
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
