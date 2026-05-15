"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, BookOpen, ArrowRight } from "lucide-react";
import { ARTICLES, CATEGORIES, getArticlesByCategory } from "@/data/mockArticles";

export default function ReadingPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const articles = getArticlesByCategory(activeCategory);

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground mb-2">
          📰 Trung tâm <span className="gradient-text">Bài đọc</span>
        </h1>
        <p className="text-gray-500 text-sm">Đọc tin tức và truyện song ngữ Anh-Việt. Click vào bất kỳ từ nào trong bài để tra nghĩa.</p>
      </motion.div>

      {/* Category tabs */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeCategory === cat.id
                ? "bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-md shadow-primary-500/20"
                : "bg-surface-elevated border border-border-color text-gray-600 hover:border-primary-300 hover:text-primary-600"
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </motion.div>

      {/* Articles grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article, i) => (
          <motion.div
            key={article.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
          >
            <Link href={`/reading/${article.slug}`} className="portal-card block overflow-hidden group h-full">
              <div className="aspect-[16/10] overflow-hidden relative">
                <img
                  src={article.thumbnail}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="px-2.5 py-1 text-[10px] font-bold bg-white/90 backdrop-blur-sm text-primary-600 rounded-lg shadow-sm">
                    {article.level}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {article.readingTime} phút
                  </span>
                  <span>{article.date}</span>
                </div>
                <h3 className="text-base font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors leading-snug">
                  {article.title}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2">{article.titleVi}</p>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary-500 group-hover:gap-2 transition-all">
                  Đọc ngay <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
