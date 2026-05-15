"use client";

import { useState, useCallback, use } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, BookOpen, Eye, EyeOff, Volume2 } from "lucide-react";
import { getArticleBySlug } from "@/data/mockArticles";
import { searchWords } from "@/data/mockWords";

export default function ReadingDetailPage({ params }) {
  const { slug } = use(params);
  const article = getArticleBySlug(slug);
  const [showVi, setShowVi] = useState(true);
  const [popover, setPopover] = useState(null);

  const handleWordClick = useCallback((word) => {
    const clean = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
    if (clean.length < 2) return;
    const results = searchWords(clean);
    if (results.length > 0) {
      setPopover({ word: results[0], x: 0, y: 0 });
    } else {
      setPopover({ word: { word: clean, meanings: ["(Không tìm thấy trong từ điển)"], phonetic_uk: "", pos: "" }, x: 0, y: 0 });
    }
  }, []);

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-6xl mb-4">📄</p>
        <h2 className="text-xl font-bold text-foreground mb-2">Không tìm thấy bài viết</h2>
        <Link href="/reading" className="text-primary-500 hover:text-primary-600 font-medium">← Quay lại danh sách</Link>
      </div>
    );
  }

  const renderInteractiveText = (text) => {
    return text.split(/(\s+)/).map((word, i) => {
      if (/^\s+$/.test(word)) return word;
      return (
        <span
          key={i}
          className="word-highlight cursor-pointer hover:bg-primary-100 hover:text-primary-700 rounded px-0.5 transition-colors"
          onClick={() => handleWordClick(word)}
        >
          {word}
        </span>
      );
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back nav */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
        <Link href="/reading" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
        </Link>
      </motion.div>

      {/* Article header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="aspect-[21/9] rounded-2xl overflow-hidden mb-6">
          <img src={article.thumbnail} alt={article.title} className="w-full h-full object-cover" />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span className="px-3 py-1 text-xs font-bold bg-primary-100 text-primary-700 rounded-full">{article.level}</span>
          <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3 h-3" /> {article.readingTime} phút đọc</span>
          <span className="text-xs text-gray-400">{article.date}</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground mb-2 leading-tight">{article.title}</h1>
        <p className="text-base text-gray-500 mb-6">{article.titleVi}</p>
      </motion.div>

      {/* Controls */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="flex items-center gap-3 mb-8 p-3 portal-card"
      >
        <button
          onClick={() => setShowVi(!showVi)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            showVi
              ? "bg-primary-50 text-primary-600 border border-primary-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {showVi ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {showVi ? "Ẩn bản dịch" : "Hiện bản dịch"}
        </button>
        <span className="text-xs text-gray-400">💡 Click vào bất kỳ từ tiếng Anh nào để tra nghĩa</span>
      </motion.div>

      {/* Content */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="portal-card p-6 md:p-8 interactive-text"
      >
        <div className="space-y-8">
          {article.paragraphs.map((para, i) => (
            <div key={i} className="space-y-2">
              <p className="reading-content text-foreground leading-relaxed">
                {renderInteractiveText(para.en)}
              </p>
              <AnimatePresence>
                {showVi && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-sm text-gray-500 italic pl-4 border-l-2 border-primary-200 leading-relaxed"
                  >
                    {para.vi}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Word popover */}
      <AnimatePresence>
        {popover && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 bg-surface-elevated border border-border-color rounded-2xl shadow-2xl p-5 w-80 z-50"
          >
            <button onClick={() => setPopover(null)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-sm cursor-pointer">✕</button>
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-lg font-bold text-foreground capitalize">{popover.word.word}</h4>
              {popover.word.pos && (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-primary-100 text-primary-600 rounded-full">{popover.word.pos}</span>
              )}
            </div>
            {popover.word.phonetic_uk && (
              <p className="text-xs text-gray-500 font-mono mb-2">{popover.word.phonetic_uk}</p>
            )}
            <p className="text-sm text-foreground">{popover.word.meanings[0]}</p>
            {popover.word.examples && popover.word.examples[0] && (
              <p className="text-xs text-gray-400 mt-2 italic">&ldquo;{popover.word.examples[0].en}&rdquo;</p>
            )}
            <button className="mt-3 w-full py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg text-sm font-semibold hover:from-primary-600 hover:to-secondary-600 transition-all cursor-pointer">
              ⭐ Lưu từ này
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
