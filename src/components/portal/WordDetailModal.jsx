"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Volume2, Star, Loader2 } from "lucide-react";
import { speak } from "@/lib/tts";
import { lookupWord } from "@/lib/dictionaryAPI";

export default function WordDetailModal({
  words,
  initialIndex = 0,
  onClose,
  onToggleDifficult,
  progressMap,
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [dictData, setDictData] = useState(null);
  const [loadingDict, setLoadingDict] = useState(false);

  const currentWord = words[currentIndex];
  const progress = progressMap[currentWord?.id];

  useEffect(() => {
    if (!currentWord) return;
    async function fetchDict() {
      setLoadingDict(true);
      const data = await lookupWord(currentWord.word);
      setDictData(data);
      setLoadingDict(false);
    }
    fetchDict();
  }, [currentWord]);

  if (!currentWord) return null;

  const goNext = () => {
    if (currentIndex < words.length - 1) setCurrentIndex(c => c + 1);
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(c => c - 1);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[800px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-400">
                Từ {currentIndex + 1} / {words.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 md:p-10">
            {/* Word Banner */}
            <div className="text-center mb-8">
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-3 tracking-tight">
                {currentWord.word}
              </h2>
              <div className="flex items-center justify-center gap-3 mb-6">
                {currentWord.pronunciation && (
                  <span className="text-lg text-violet-500 italic">
                    {currentWord.pronunciation}
                  </span>
                )}
                {currentWord.pos && (
                  <span className="text-xs font-bold text-violet-600 bg-violet-100 px-2 py-1 rounded-md">
                    {currentWord.pos}
                  </span>
                )}
                <button
                  onClick={() => speak(currentWord.word)}
                  className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center cursor-pointer hover:bg-violet-100 hover:scale-110 transition-all"
                >
                  <Volume2 className="w-5 h-5 text-violet-500" />
                </button>
              </div>

              {/* Primary Meaning */}
              <div className="inline-block px-6 py-3 bg-gradient-to-r from-primary-50 to-violet-50 rounded-2xl border border-violet-100">
                <p className="text-xl font-bold text-gray-800">
                  {currentWord.meaning}
                </p>
              </div>
            </div>

            {/* Dictionary Data */}
            <div className="space-y-6">
              {loadingDict ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                </div>
              ) : dictData ? (
                <>
                  {/* English Definitions */}
                  {dictData.definitions?.slice(0, 3).map((def, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                      <p className="text-[15px] text-gray-800 font-medium mb-3">
                        <span className="text-primary-500 font-bold mr-2">{idx + 1}.</span>
                        {def.definition}
                      </p>
                      {def.example && (
                        <div className="flex items-start gap-3 mt-3 pt-3 border-t border-gray-200/60">
                          <span className="text-lg">💬</span>
                          <p className="text-sm text-gray-600 italic leading-relaxed">
                            {def.example}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Synonyms */}
                  {dictData.synonyms?.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Từ đồng nghĩa</h4>
                      <div className="flex flex-wrap gap-2">
                        {dictData.synonyms.map((syn, i) => (
                          <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg">
                            {syn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : currentWord.example && (
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                   <div className="flex items-start gap-3">
                      <span className="text-lg">💬</span>
                      <p className="text-sm text-gray-600 italic leading-relaxed">
                        {currentWord.example}
                      </p>
                    </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-between gap-4">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="p-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={() => onToggleDifficult(currentWord.id)}
              className={`flex-1 py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
                progress?.isDifficult
                  ? "bg-amber-100 text-amber-600 hover:bg-amber-200"
                  : "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20"
              }`}
            >
              <Star className={`w-5 h-5 ${progress?.isDifficult ? "fill-amber-500" : "fill-white"}`} />
              {progress?.isDifficult ? "Đã lưu từ" : "Lưu từ này"}
            </button>

            <button
              onClick={goNext}
              disabled={currentIndex === words.length - 1}
              className="p-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
