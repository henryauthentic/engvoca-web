"use client";

import { motion } from "framer-motion";
import { Star, Volume2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getWordProgress, getWordsByIds } from "@/lib/firestoreService";
import { filterDifficultWords } from "@/mappers/wordProgressMapper";
import { useAuth } from "@/lib/AuthContext";
import { Loader2 } from "lucide-react";

export default function DifficultWordsWidget() {
  const { user } = useAuth();
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);

  const speak = (text) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    }
  };

  useEffect(() => {
    if (!user?.uid) return;

    const fetchDifficultWords = async () => {
      try {
        const rawProgress = await getWordProgress(user.uid);
        const filtered = filterDifficultWords(rawProgress);

        if (filtered.length === 0) {
          setWords([]);
          setLoading(false);
          return;
        }

        // Resolve UUIDs → real Word data from Firestore "words" collection
        const wordIds = filtered.map((w) => w.wordId).filter(Boolean);
        const fullWords = await getWordsByIds(wordIds);

        // Merge: keep wrongCount from progress, add word/meaning/pronunciation from words collection
        const merged = filtered.map((progress) => {
          const wordData = fullWords.find(
            (w) => w.id === progress.wordId
          );
          return {
            ...progress,
            word: wordData?.word || progress.wordId,
            meaning: wordData?.meaning || "",
            pronunciation: wordData?.pronunciation || "",
          };
        });

        setWords(merged);
      } catch (e) {
        console.error("Lỗi lấy từ khó:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchDifficultWords();
  }, [user]);

  if (loading) {
    return (
      <div className="portal-card p-5 flex items-center justify-center h-40">
        <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
      </div>
    );
  }

  if (words.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="portal-card overflow-hidden"
    >
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50">
        <h3 className="text-sm font-bold text-amber-600 flex items-center gap-2">
          <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
          Từ khó cần ôn ({words.length})
        </h3>
        <Link
          href="/flashcards?mode=difficult"
          className="text-xs font-bold px-3 py-1.5 bg-amber-500 text-white rounded-full hover:bg-amber-600 transition-colors shadow-sm"
        >
          Ôn ngay
        </Link>
      </div>

      <div className="p-2">
        <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
          {words.slice(0, 5).map((item, i) => (
            <div
              key={item.wordId || i}
              className="flex items-center gap-3 p-2.5 hover:bg-amber-50/50 rounded-lg group transition-colors"
            >
              {/* Word info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground group-hover:text-amber-600 transition-colors capitalize">
                    {item.word}
                  </span>
                  {item.pronunciation && (
                    <span className="text-[10px] text-gray-400 italic">
                      /{item.pronunciation}/
                    </span>
                  )}
                </div>
                {item.meaning && (
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                    {item.meaning}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => speak(item.word)}
                  className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  <Volume2 className="w-3 h-3 text-blue-500" />
                </button>
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              </div>
            </div>
          ))}
          {words.length > 5 && (
            <div className="p-2 text-center">
              <span className="text-xs text-gray-400 font-medium">
                + {words.length - 5} từ khác
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
