"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X, Pencil, Trash2, ChevronLeft, ChevronRight, Copy,
  CheckCircle2, AlertTriangle, BookOpen, Volume2, Image,
} from "lucide-react";
import { useState } from "react";

const POS_LABELS = {
  noun: "Danh từ", verb: "Động từ", adj: "Tính từ", adv: "Trạng từ",
  prep: "Giới từ", conj: "Liên từ", pron: "Đại từ", phrase: "Cụm từ",
};

const DIFFICULTY_CONFIG = {
  1: { label: "Dễ", cls: "admin-badge-green" },
  2: { label: "Trung bình", cls: "admin-badge-blue" },
  3: { label: "Khó", cls: "admin-badge-orange" },
  4: { label: "Rất khó", cls: "admin-badge-red" },
  5: { label: "Expert", cls: "admin-badge-red" },
};

function QualityItem({ ok, label }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {ok
        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        : <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
      }
      <span className={`text-xs ${ok ? "text-gray-500" : "text-amber-600 font-medium"}`}>{label}</span>
    </div>
  );
}

export default function WordDetailDrawer({
  open,
  word,
  onClose,
  onEdit,
  onDelete,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  topicName,
}) {
  const [copied, setCopied] = useState(null);

  if (!word) return null;

  async function copyText(text, field) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* ignore */ }
  }

  const diff = DIFFICULTY_CONFIG[word.difficulty_level] || DIFFICULTY_CONFIG[1];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-[400px] bg-surface-elevated border-l border-border-color shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-color flex-shrink-0">
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
                <span className="text-xs text-gray-400 font-medium">Chi tiết từ vựng</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={onPrev} disabled={!hasPrev} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-not-allowed">
                  <ChevronLeft className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={onNext} disabled={!hasNext} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-not-allowed">
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Word header */}
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{word.word}</h2>
                    {word.pronunciation && (
                      <p className="text-sm text-gray-400 mt-1">{word.pronunciation}</p>
                    )}
                  </div>
                  <button
                    onClick={() => copyText(word.word, "word")}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0"
                    title="Copy từ"
                  >
                    {copied === "word"
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      : <Copy className="w-4 h-4 text-gray-400" />
                    }
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {word.pos && (
                    <span className="admin-badge admin-badge-blue">{POS_LABELS[word.pos] || word.pos}</span>
                  )}
                  <span className={`admin-badge ${diff.cls}`}>{diff.label}</span>
                </div>
              </div>

              {/* Meaning */}
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-blue-500 uppercase tracking-wide mb-1">Nghĩa</p>
                    <p className="text-sm text-foreground leading-relaxed">{word.meaning || "—"}</p>
                  </div>
                  <button
                    onClick={() => copyText(word.meaning || "", "meaning")}
                    className="p-1.5 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer flex-shrink-0 mt-0.5"
                  >
                    {copied === "meaning"
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      : <Copy className="w-3.5 h-3.5 text-blue-400" />
                    }
                  </button>
                </div>
              </div>

              {/* Example */}
              {word.example && (
                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Ví dụ</p>
                  <p className="text-sm text-gray-700 italic leading-relaxed">&ldquo;{word.example}&rdquo;</p>
                </div>
              )}

              {/* Metadata */}
              <div className="space-y-2.5">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Thông tin</p>
                {[
                  ["Chủ đề", topicName || word.topic_id || "—"],
                  ["Ngày tạo", word.created_at ? new Date(word.created_at).toLocaleDateString("vi-VN") : "—"],
                  ["Cập nhật", word.updated_at ? new Date(word.updated_at).toLocaleDateString("vi-VN") : "—"],
                  ["ID", word.id?.substring(0, 16) + "..."],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between py-1.5 border-b border-border-color last:border-0">
                    <span className="text-xs text-gray-400">{label}</span>
                    <span className="text-xs font-medium text-foreground font-mono">{value}</span>
                  </div>
                ))}
              </div>

              {/* Quality Check */}
              <div className="p-4 rounded-xl border border-border-color bg-surface">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Kiểm tra chất lượng</p>
                <QualityItem ok={!!word.pronunciation} label={word.pronunciation ? "Có phiên âm IPA" : "Thiếu phiên âm IPA"} />
                <QualityItem ok={!!word.example} label={word.example ? "Có câu ví dụ" : "Thiếu câu ví dụ"} />
                <QualityItem ok={!!word.image_url} label={word.image_url ? "Có hình ảnh" : "Thiếu hình ảnh"} />
                <QualityItem ok={!!word.audio_url} label={word.audio_url ? "Có audio" : "Thiếu audio"} />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center gap-2 px-5 py-4 border-t border-border-color flex-shrink-0">
              <button
                onClick={() => onEdit?.(word)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
                Chỉnh sửa
              </button>
              <button
                onClick={() => onDelete?.(word)}
                className="p-2.5 rounded-xl border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
