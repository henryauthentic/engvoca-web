"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Volume2, Star, BookPlus, Loader2, TrendingUp, Flame } from "lucide-react";
import { searchWords, WORD_LIST } from "@/data/mockWords";
import { lookupWord } from "@/lib/dictionaryAPI";
import { useAuth } from "@/lib/AuthContext";
import { getSingleWordProgress, toggleDifficultWord } from "@/lib/firestoreService";

function DictionaryContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [selectedWord, setSelectedWord] = useState(null);
  const [apiResult, setApiResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(new Set());
  const [wordProgress, setWordProgress] = useState(null);
  const [activeTab, setActiveTab] = useState("definitions");
  const audioRef = useRef(null);
  const { user } = useAuth();

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setSelectedWord(null); setApiResult(null); return; }
    setLoading(true);

    const mockResults = searchWords(q);
    setResults(mockResults);
    if (mockResults.length > 0) setSelectedWord(mockResults[0]);

    try {
      const apiData = await lookupWord(q.trim());
      if (apiData) {
        setApiResult(apiData);
        
        // Find if the exact word exists in mockResults
        const exactMatchIndex = mockResults.findIndex(w => w.word.toLowerCase() === apiData.word.toLowerCase());
        
        if (exactMatchIndex === -1) {
          const syntheticWord = {
            id: `api-${apiData.word}`,
            word: apiData.word,
            phonetic_uk: apiData.phonetic || "",
            pos: apiData.partOfSpeech || "noun",
            level: "A2",
            meanings: apiData.definitions.slice(0, 3).map((d) => d.definition),
            examples: apiData.definitions.filter((d) => d.example).slice(0, 2).map((d) => ({ en: d.example, vi: "" })),
            synonyms: apiData.synonyms || [],
            antonyms: apiData.antonyms || [],
          };
          setResults(prev => {
            const filtered = prev.filter(w => w.id !== syntheticWord.id);
            return [syntheticWord, ...filtered];
          });
          setSelectedWord(syntheticWord);
        } else {
          // Ensure exact match is selected
          setSelectedWord(mockResults[exactMatchIndex]);
        }
      } else {
        // If no API data but we have mock results, sort exact matches first
        if (mockResults.length > 0) {
            const exactMatch = mockResults.find(w => w.word.toLowerCase() === q.trim().toLowerCase());
            if (exactMatch) setSelectedWord(exactMatch);
        }
      }
    } catch (err) {
      console.error("API lookup failed", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (initialQuery) doSearch(initialQuery);
  }, [initialQuery, doSearch]);

  useEffect(() => {
    async function fetchProgress() {
      if (!user?.uid || !selectedWord) {
        setWordProgress(null);
        return;
      }
      const wordId = (selectedWord.id || selectedWord.word).toLowerCase().replace(/[^a-z0-9]/g, '');
      const progress = await getSingleWordProgress(user.uid, wordId);
      setWordProgress(progress);
      
      setSaved(prev => {
        const next = new Set(prev);
        if (progress && (progress.isDifficult || progress.is_difficult)) {
          next.add(wordId);
        } else {
          next.delete(wordId);
        }
        return next;
      });
    }
    fetchProgress();
  }, [user, selectedWord]);

  const toggleSave = async (word) => {
    if (!user?.uid) return;
    const wordId = (word.id || word.word).toLowerCase().replace(/[^a-z0-9]/g, '');
    const isSaved = saved.has(wordId);
    
    // Optimistic update
    setSaved(prev => {
      const next = new Set(prev);
      if (isSaved) next.delete(wordId); else next.add(wordId);
      return next;
    });
    
    try {
      const wordMeta = {
        word: word.word,
        meaning: word.meanings?.[0] || "",
        meanings: word.meanings || [],
        pronunciation: word.pronunciation || "",
      };
      await toggleDifficultWord(user.uid, wordId, wordMeta);
    } catch (e) {
      console.error("Lỗi toggle lưu từ:", e);
      // Revert if failed
      setSaved(prev => {
        const next = new Set(prev);
        if (!isSaved) next.delete(wordId); else next.add(wordId);
        return next;
      });
    }
  };

  const playAudio = () => {
    if (apiResult?.audioUrl && audioRef.current) {
      audioRef.current.src = apiResult.audioUrl;
      audioRef.current.play();
    }
  };

  const hasApiData = apiResult && apiResult.word?.toLowerCase() === selectedWord?.word?.toLowerCase();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <audio ref={audioRef} className="hidden" />

      {/* Hero Search Section */}
      <section className="mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-3xl md:text-4xl font-black text-foreground mb-3 tracking-tight">
              📖 Từ điển <span className="text-primary-600">ENG VOCA</span>
            </h1>
            <p className="text-gray-500 max-w-lg">
              Tra cứu từ vựng tiếng Anh với sức mạnh AI. Hỗ trợ phiên âm, ví dụ và lộ trình ghi nhớ thông minh.
            </p>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Main Search Panel */}
          <div className="lg:col-span-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="glass p-1.5 rounded-[32px] shadow-2xl shadow-primary-500/5 glow-focus border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-center gap-3 px-6 py-4">
                <Search className="w-6 h-6 text-primary-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doSearch(query)}
                  placeholder="Tìm kiếm từ vựng... (ví dụ: Resilient, Serendipity)"
                  className="flex-1 bg-transparent border-none outline-none text-xl font-medium text-foreground placeholder:text-gray-400"
                />
                <button
                  onClick={() => doSearch(query)}
                  className="bg-primary-600 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/25 active:scale-95"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Tìm kiếm"}
                </button>
              </div>
            </motion.div>

            {/* Trending & Recent */}
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" /> Trending
              </span>
              <div className="flex flex-wrap gap-2">
                {["resilient", "ubiquitous", "pragmatic", "eloquent"].map(w => (
                  <button key={w} onClick={() => {setQuery(w); doSearch(w);}} className="px-4 py-2 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl text-xs font-semibold text-gray-600 hover:border-primary-400 hover:text-primary-600 transition-all cursor-pointer">
                    {w}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Word of the Day Side Panel */}
          {!selectedWord && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="lg:col-span-4 hidden lg:block"
            >
              <div className="portal-card p-6 bg-gradient-to-br from-primary-600 to-secondary-600 text-white border-none relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                  <Star className="w-32 h-32 rotate-12" />
                </div>
                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">Word of the Day</span>
                <h2 className="text-3xl font-black mb-1 capitalize">Serendipity</h2>
                <p className="text-white/80 text-sm italic mb-4">/ˌser.ənˈdɪp.ə.ti/</p>
                <p className="text-white/90 text-sm leading-relaxed mb-6">Sự may mắn khi tìm thấy điều tốt đẹp một cách tình cờ.</p>
                <button className="w-full py-3 bg-white text-primary-600 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors">Khám phá ngay</button>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Results List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
              {results.length > 0 ? `${results.length} Kết quả` : "Gợi ý cho bạn"}
            </h3>
          </div>
          <div className="space-y-3">
            {(results.length > 0 ? results : WORD_LIST.slice(0, 5)).map((word, idx) => (
              <motion.button
                key={word.id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                onClick={() => {
                  setQuery(word.word);
                  doSearch(word.word);
                }}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 group ${
                  selectedWord?.id === word.id 
                    ? "bg-primary-50 border-primary-200 shadow-lg shadow-primary-500/5 scale-[1.02]" 
                    : "bg-[var(--surface-elevated)] border-[var(--border-color)] hover:border-primary-200 hover:shadow-md"
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold transition-all ${
                   selectedWord?.id === word.id ? "bg-primary-600 text-white" : "bg-[var(--surface)] text-gray-400 group-hover:bg-primary-100 group-hover:text-primary-600"
                }`}>
                  {word.word[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold transition-colors ${selectedWord?.id === word.id ? "text-primary-700" : "text-foreground"}`}>
                    {word.word}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{word.meanings[0]}</p>
                </div>
                <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${
                  word.level === 'C1' ? 'bg-error-light text-error' : 
                  word.level === 'B2' ? 'bg-warning-light text-warning' : 'bg-success-light text-success'
                }`}>
                  {word.level}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Word Detail Panel */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {selectedWord ? (
              <motion.div
                key={selectedWord.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="portal-card overflow-hidden !border-none shadow-2xl shadow-[var(--border-color)]"
              >
                {/* Word Hero */}
                <div className="p-8 md:p-10 bg-[var(--surface)] border-b border-[var(--border-color)]">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <h2 className="text-4xl md:text-5xl font-black text-foreground capitalize tracking-tight">{selectedWord.word}</h2>
                        <button onClick={playAudio} className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center hover:scale-110 transition-all">
                          <Volume2 className="w-6 h-6" />
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 mb-6">
                        <span className="font-mono text-gray-400 text-lg">/{selectedWord.phonetic_uk || apiResult?.phonetic}/</span>
                        <span className="px-3 py-1 bg-primary-50 text-primary-600 rounded-lg text-xs font-bold uppercase tracking-widest">{selectedWord.pos}</span>
                        <span className="px-3 py-1 bg-success-light text-success rounded-lg text-xs font-bold uppercase tracking-widest">{selectedWord.level}</span>
                        <button className="text-gray-400 hover:text-primary-600 flex items-center gap-1.5 text-xs font-bold transition-colors">
                          <BookPlus className="w-4 h-4" /> Thêm nhãn
                        </button>
                      </div>

                      {/* Memory Progress */}
                      {wordProgress && wordProgress.status > 0 && (() => {
                        const mStatus = wordProgress.status === 3 ? { label: "Mastered", color: "text-success", bg: "bg-success-light", desc: "Bạn đã ghi nhớ từ này rất tốt!" } :
                                        wordProgress.status === 2 ? { label: "Reviewing", color: "text-warning", bg: "bg-warning-light", desc: "Đang trong quá trình ôn tập ngắt quãng." } :
                                        { label: "Learning", color: "text-primary-600", bg: "bg-primary-50", desc: "Từ mới đang được học." };
                        const progressPercent = Math.min(100, Math.round(((wordProgress.intervalDays || 0) / 21) * 100));
                        
                        return (
                          <div className="bg-[var(--surface-elevated)] rounded-2xl p-5 border border-[var(--border-color)] max-w-md">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-bold text-gray-500 flex items-center gap-2">
                                <Flame className={`w-4 h-4 ${mStatus.color}`} /> Trạng thái ghi nhớ
                              </span>
                              <span className={`text-xs font-black ${mStatus.color}`}>{progressPercent}%</span>
                            </div>
                            <div className="h-2.5 bg-[var(--surface)] rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} className="h-full bg-gradient-to-r from-primary-500 to-secondary-500" />
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                               <span className={`px-2 py-0.5 ${mStatus.bg} ${mStatus.color} rounded text-[10px] font-bold uppercase`}>{mStatus.label}</span>
                               <span className="text-[10px] text-gray-400">{mStatus.desc}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex md:flex-col gap-3">
                      <button onClick={() => toggleSave(selectedWord)} className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all ${
                        saved.has((selectedWord.id || selectedWord.word).toLowerCase().replace(/[^a-z0-9]/g, ''))
                          ? "bg-warning-light border-warning text-warning scale-110"
                          : "bg-[var(--surface-elevated)] border-[var(--border-color)] text-gray-400 hover:text-warning"
                      }`}>
                        <Star className="w-6 h-6" fill={saved.has((selectedWord.id || selectedWord.word).toLowerCase().replace(/[^a-z0-9]/g, '')) ? "currentColor" : "none"} />
                      </button>
                    </div>
                  </div>

                  {/* CTAs */}
                  <div className="mt-8">
                    <button onClick={() => alert("Bạn vui lòng sử dụng app để dùng tính năng này")} className="w-full py-4 bg-[var(--surface-elevated)] border border-[var(--border-color)] text-foreground rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[var(--surface)] transition-all group">
                      <span className="group-hover:rotate-12 transition-transform">✨</span> AI giải thích chi tiết
                    </button>
                  </div>
                </div>

                {/* Content Tabs */}
                <div className="bg-[var(--surface-elevated)]">
                  <div className="flex border-b border-[var(--border-color)] px-6 overflow-x-auto">
                    {[
                      {id: "definitions", label: "Định nghĩa"},
                      {id: "examples", label: "Ví dụ"},
                      {id: "synonyms", label: "Đồng nghĩa"},
                      {id: "antonyms", label: "Trái nghĩa"}
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-4 px-6 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${
                          activeTab === tab.id ? "border-primary-600 text-primary-600" : "border-transparent text-gray-400 hover:text-gray-600"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="p-8 md:p-10">
                    <AnimatePresence mode="wait">
                      {activeTab === "definitions" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
                          {(hasApiData ? apiResult.definitions : selectedWord.meanings).map((def, i) => (
                            <div key={i} className="flex gap-6 group">
                              <span className="w-8 h-8 rounded-full bg-[var(--surface)] text-gray-400 flex items-center justify-center text-xs font-black flex-shrink-0 group-hover:bg-primary-600 group-hover:text-white transition-all">
                                {i + 1}
                              </span>
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[10px] font-black uppercase text-primary-500 bg-primary-50 px-2 py-0.5 rounded">{typeof def === 'string' ? selectedWord.pos : def.pos}</span>
                                </div>
                                <p className="text-lg font-medium text-foreground leading-relaxed mb-3">{typeof def === 'string' ? def : def.definition}</p>
                                {typeof def !== 'string' && def.definitionVi && (
                                  <p className="text-gray-500 bg-[var(--surface)] p-4 rounded-xl border-l-4 border-primary-500">→ {def.definitionVi}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}

                      {activeTab === "examples" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                          {selectedWord.examples?.map((ex, i) => (
                            <div key={i} className="p-6 bg-[var(--surface)] rounded-2xl border border-[var(--border-color)] hover:border-primary-200 transition-all">
                              <p className="text-lg text-foreground italic mb-2">&ldquo;{ex.en}&rdquo;</p>
                              {ex.vi && <p className="text-gray-500">→ {ex.vi}</p>}
                            </div>
                          ))}
                        </motion.div>
                      )}

                      {activeTab === "synonyms" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-wrap gap-3">
                          {(hasApiData ? apiResult.synonyms : selectedWord.synonyms)?.map(s => (
                             <button key={s} onClick={() => {setQuery(s); doSearch(s);}} className="px-5 py-3 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl text-sm font-bold text-gray-600 hover:border-primary-500 hover:text-primary-600 transition-all cursor-pointer">
                               {s}
                             </button>
                          ))}
                        </motion.div>
                      )}

                      {activeTab === "antonyms" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-wrap gap-3">
                          {(hasApiData ? apiResult.antonyms : selectedWord.antonyms)?.map(a => (
                             <button key={a} onClick={() => {setQuery(a); doSearch(a);}} className="px-5 py-3 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl text-sm font-bold text-gray-600 hover:border-error hover:text-error transition-all cursor-pointer">
                               {a}
                             </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="portal-card p-20 text-center flex flex-col items-center">
                 <div className="w-24 h-24 rounded-full bg-primary-50 flex items-center justify-center mb-6">
                    <Search className="w-10 h-10 text-primary-600" />
                 </div>
                 <h3 className="text-2xl font-black mb-3">Sẵn sàng để học?</h3>
                 <p className="text-gray-500 max-w-sm mx-auto mb-8">Tra cứu từ vựng bất kỳ để bắt đầu hành trình chinh phục tiếng Anh của bạn.</p>
                 <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                    <div className="p-4 bg-[var(--surface)] rounded-2xl">
                       <p className="text-xl font-black text-primary-600">300k+</p>
                       <p className="text-[10px] text-gray-400 uppercase font-bold mt-1">Từ vựng</p>
                    </div>
                    <div className="p-4 bg-[var(--surface)] rounded-2xl">
                       <p className="text-xl font-black text-success">24/7</p>
                       <p className="text-[10px] text-gray-400 uppercase font-bold mt-1">AI Support</p>
                    </div>
                 </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function DictionaryPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto p-8"><div className="skeleton h-12 w-64 mb-8" /><div className="skeleton h-64 w-full" /></div>}>
      <DictionaryContent />
    </Suspense>
  );
}
