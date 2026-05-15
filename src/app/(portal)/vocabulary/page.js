"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Volume2, Loader2, ChevronRight, ChevronDown,
  Star, BookOpen, Zap, MoreHorizontal, Plus, PlayCircle,
  ClipboardCheck, ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import {
  getTopics,
  getUserStats,
  getWordsByTopic,
  getWordProgress,
  toggleDifficultWord,
} from "@/lib/firestoreService";
import { mapWordProgress, countByStatus, getStatusDisplay } from "@/mappers/wordProgressMapper";
import { speak } from "@/lib/tts";
import WordDetailModal from "@/components/portal/WordDetailModal";
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

const STATUS_COLORS = {
  0: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200", label: "Mới" },
  1: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200", label: "Đang học" },
  2: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200", label: "Đang học" },
  3: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", label: "Thuộc" },
};

export default function VocabularyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const chipsRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [parentTopics, setParentTopics] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState(null);
  const [allChildTopics, setAllChildTopics] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [words, setWords] = useState([]);
  const [wordProgressMap, setWordProgressMap] = useState({});
  const [loadingWords, setLoadingWords] = useState(false);
  const [selectedWordIndex, setSelectedWordIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCTADropdown, setShowCTADropdown] = useState(false);

  // Load topics
  useEffect(() => {
    async function load() {
      if (!user?.uid) return;
      try {
        const [allTopics, rawUser] = await Promise.all([
          getTopics(),
          getUserStats(user.uid),
        ]);

        const parents = allTopics.filter((t) => !t.parent_id);
        const children = allTopics.filter((t) => t.parent_id);

        setParentTopics(parents);
        setAllChildTopics(children);

        // Check URL hash for preselected topic from dashboard
        const hash = window.location.hash;
        let preselectedParent = null;
        if (hash && hash.startsWith("#topic-")) {
          const targetId = hash.replace("#topic-", "");
          preselectedParent = parents.find(p => String(p.id) === targetId);
        }

        if (parents.length > 0) {
          const activeParent = preselectedParent || parents[0];
          setSelectedParentId(activeParent.id);
          const firstChildren = children.filter((c) => c.parent_id === activeParent.id);
          if (firstChildren.length > 0) setSelectedTopicId(firstChildren[0].id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  // Child topics for selected parent
  const topics = allChildTopics.filter((t) => t.parent_id === selectedParentId);

  // Load words when topic changes
  useEffect(() => {
    async function loadWords() {
      if (!selectedTopicId || !user?.uid) return;
      setLoadingWords(true);
      try {
        const [topicWords, progressDocs] = await Promise.all([
          getWordsByTopic(selectedTopicId),
          getWordProgress(user.uid),
        ]);

        const pMap = {};
        for (const doc of progressDocs) {
          const mapped = mapWordProgress(doc);
          if (mapped) pMap[mapped.wordId] = mapped;
        }
        setWordProgressMap(pMap);
        setWords(topicWords);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingWords(false);
      }
    }
    loadWords();
  }, [selectedTopicId, user]);

  // Filter words
  const filteredWords = words.filter((w) => {
    const matchSearch = !searchQuery ||
      w.word?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.meaning?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;
    if (statusFilter === "all") return true;
    const p = wordProgressMap[w.id];
    const status = p?.status ?? 0;
    if (statusFilter === "new") return status === 0;
    if (statusFilter === "learning") return status === 1 || status === 2;
    if (statusFilter === "mastered") return status === 3;
    return true;
  });

  const selectedTopic = topics.find((t) => t.id === selectedTopicId);
  const statusCounts = countByStatus(
    words.map((w) => wordProgressMap[w.id] || { status: 0 })
  );
  const totalWords = words.length;
  const learnedTotal = statusCounts.learning + statusCounts.reviewing + statusCounts.mastered;
  const progressPct = totalWords > 0 ? Math.round((learnedTotal / totalWords) * 100) : 0;

  const handleToggleDifficult = async (wordId) => {
    if (!user?.uid) return;
    try {
      const newState = await toggleDifficultWord(user.uid, wordId);
      setWordProgressMap((prev) => ({
        ...prev,
        [wordId]: { ...prev[wordId], isDifficult: newState },
      }));
    } catch (e) {
      console.error("Lỗi đánh dấu từ khó:", e);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* ========== HEADER ========== */}
      <div className="flex items-center justify-between mb-6">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl md:text-3xl font-extrabold text-foreground"
        >
          📚 <span className="gradient-text">Từ vựng của tôi</span>
        </motion.h1>
      </div>

      {/* ========== STATS CARDS ========== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6"
      >
        {[
          { icon: "📖", label: "Tổng từ", value: totalWords, color: "text-primary-600", bg: "bg-primary-50" },
          { icon: "🆕", label: "Từ mới", value: statusCounts.newWords, color: "text-blue-600", bg: "bg-blue-50" },
          { icon: "📝", label: "Đang học", value: statusCounts.learning + statusCounts.reviewing, color: "text-amber-600", bg: "bg-amber-50" },
          { icon: "✅", label: "Thuộc", value: statusCounts.mastered, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((s) => (
          <div key={s.label} className="portal-card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center text-lg`}>
              {s.icon}
            </div>
            <div>
              <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-gray-400 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
        {/* Progress card */}
        <div className="portal-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-lg">📊</div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-400 font-medium mb-1">Tiến độ học tập</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"
                />
              </div>
              <span className="text-xs font-bold text-primary-600">{progressPct}%</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ========== TOPIC SELECTOR ========== */}
      <TopicSelector
        parentTopics={parentTopics}
        selectedParentId={selectedParentId}
        onSelectParent={(id) => {
          setSelectedParentId(id);
          const children = allChildTopics.filter((c) => c.parent_id === id);
          if (children.length > 0) setSelectedTopicId(children[0].id);
          setSearchQuery("");
          setStatusFilter("all");
        }}
        childTopics={topics}
        selectedTopicId={selectedTopicId}
        onSelectTopic={(id) => {
          setSelectedTopicId(id);
          setSearchQuery("");
          setStatusFilter("all");
        }}
        className="mb-5"
      />

      {/* ========== CONTINUE LEARNING CTA ========== */}
      {selectedTopic && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="portal-card p-5 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Tiếp tục học</h3>
              <p className="text-xs text-gray-400">Học từ vựng qua Flashcard hoặc Trắc nghiệm</p>
            </div>
          </div>
          <div className="relative flex gap-2">
            <button
              onClick={() => router.push(`/flashcards?topic=${selectedTopicId}`)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl font-semibold text-sm cursor-pointer hover:from-primary-600 hover:to-secondary-600 transition-all shadow-md shadow-primary-500/20"
            >
              <PlayCircle className="w-4 h-4" />
              Flashcard
            </button>
            <button
              onClick={() => router.push(`/practice?topic=${selectedTopicId}`)}
              className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-border-color text-foreground rounded-xl font-semibold text-sm cursor-pointer hover:border-primary-300 transition-all"
            >
              <ClipboardCheck className="w-4 h-4" />
              Trắc nghiệm
            </button>
          </div>
        </motion.div>
      )}

      {/* ========== SEARCH + FILTERS ========== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4"
      >
        <div className="flex-1 w-full flex items-center gap-2 bg-surface border border-border-color rounded-xl px-4 py-2.5">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Tìm từ trong chủ đề ${selectedTopic?.name || ""}...`}
            className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder-gray-400"
          />
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {[
            { key: "all", label: "Tất cả" },
            { key: "new", label: "Mới" },
            { key: "learning", label: "Đang học" },
            { key: "mastered", label: "Thuộc" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                statusFilter === f.key
                  ? "bg-primary-500 text-white shadow-sm"
                  : "bg-surface border border-border-color text-gray-500 hover:border-primary-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ========== WORD TABLE ========== */}
      {loadingWords ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
        </div>
      ) : filteredWords.length === 0 ? (
        <div className="portal-card p-10 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm text-gray-400">
            {searchQuery ? "Không tìm thấy từ nào." : "Chưa có từ vựng trong chủ đề này."}
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="portal-card overflow-hidden"
        >
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b border-border-color text-[11px] font-bold text-gray-500 uppercase tracking-wide">
            <div className="col-span-3">Từ vựng</div>
            <div className="col-span-2">Phiên âm</div>
            <div className="col-span-3">Nghĩa</div>
            <div className="col-span-2 text-center">Trạng thái</div>
            <div className="col-span-2 text-right">Thao tác</div>
          </div>

          {/* Table rows */}
          <div className="divide-y divide-border-color">
            {filteredWords.map((word, i) => {
              const progress = wordProgressMap[word.id];
              const status = progress?.status ?? 0;
              const sc = STATUS_COLORS[status] || STATUS_COLORS[0];
              return (
                <motion.div
                  key={word.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.015, 0.3) }}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer group items-center"
                  onClick={() => setSelectedWordIndex(i)}
                >
                  {/* Word + POS */}
                  <div className="sm:col-span-3 flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); speak(word.word); }}
                      className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-primary-100 transition-colors group-hover:scale-105"
                    >
                      <Volume2 className="w-4 h-4 text-primary-500" />
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground">{word.word}</p>
                      {word.pos && (
                        <span className="text-[10px] font-medium text-gray-400 italic">{word.pos}</span>
                      )}
                    </div>
                  </div>

                  {/* Pronunciation */}
                  <div className="sm:col-span-2 hidden sm:block">
                    <p className="text-xs text-gray-400 italic">
                      {word.pronunciation ? `/${word.pronunciation}/` : "—"}
                    </p>
                  </div>

                  {/* Meaning */}
                  <div className="sm:col-span-3">
                    <p className="text-xs text-gray-600 line-clamp-1">{word.meaning}</p>
                  </div>

                  {/* Status badge */}
                  <div className="sm:col-span-2 flex justify-start sm:justify-center">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>
                      {sc.label}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="sm:col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleDifficult(word.id); }}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        progress?.isDifficult
                          ? "text-amber-500 bg-amber-50"
                          : "text-gray-300 hover:text-amber-400 hover:bg-gray-50"
                      }`}
                      title={progress?.isDifficult ? "Bỏ đánh dấu từ khó" : "Đánh dấu từ khó"}
                    >
                      <Star className={`w-4 h-4 ${progress?.isDifficult ? "fill-amber-500" : ""}`} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); speak(word.word); }}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-primary-500 hover:bg-primary-50 cursor-pointer transition-colors"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedWordIndex(i); }}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Word Detail Modal */}
      {selectedWordIndex !== null && (
        <WordDetailModal
          words={filteredWords}
          initialIndex={selectedWordIndex}
          onClose={() => setSelectedWordIndex(null)}
          onToggleDifficult={handleToggleDifficult}
          progressMap={wordProgressMap}
        />
      )}
    </div>
  );
}
