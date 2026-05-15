"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";

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

/**
 * TopicSelector — Shared component for selecting parent + child topics.
 * Uses the Flashcard page's arrow-scroll design as the standard.
 * 
 * @param {Object} props
 * @param {Array} props.parentTopics - List of parent category objects
 * @param {string|null} props.selectedParentId - Currently selected parent ID
 * @param {Function} props.onSelectParent - (parentId) => void
 * @param {Array} props.childTopics - Filtered child topics for current parent
 * @param {string|null} props.selectedTopicId - Currently selected child topic ID
 * @param {Function} props.onSelectTopic - (topicId) => void
 * @param {Object} [props.progressMap] - { topicId: learnedCount } for progress display
 * @param {string} [props.className] - Additional wrapper classes
 */
export default function TopicSelector({
  parentTopics = [],
  selectedParentId,
  onSelectParent,
  childTopics = [],
  selectedTopicId,
  onSelectTopic,
  progressMap = {},
  className = "",
}) {
  const parentScrollRef = useRef(null);
  const childScrollRef = useRef(null);

  return (
    <div className={`portal-card p-5 ${className}`}>
      {/* ── Parent Tabs with arrows ── */}
      {parentTopics.length > 1 && (
        <div className="relative group mb-5 border-b border-gray-100">
          <button
            onClick={() => parentScrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-white border border-gray-200 rounded-full shadow-sm text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div
            ref={parentScrollRef}
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {parentTopics.map((parent) => (
              <button
                key={parent.id}
                onClick={() => onSelectParent(parent.id)}
                className={`whitespace-nowrap px-4 py-2 text-sm font-bold flex-shrink-0 cursor-pointer transition-all border-b-2 -mb-[2px] ${
                  selectedParentId === parent.id
                    ? "border-primary-500 text-primary-600 bg-primary-50 rounded-t-lg"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-t-lg"
                }`}
              >
                {parent.name}
              </button>
            ))}
          </div>
          <button
            onClick={() => parentScrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-white border border-gray-200 rounded-full shadow-sm text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-gray-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Child Topics Grid with arrows ── */}
      <div className="relative group">
        <button
          onClick={() => childScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
          className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 p-2 bg-white border border-gray-200 rounded-full shadow-md text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-gray-50"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div
          ref={childScrollRef}
          className="grid grid-rows-2 grid-flow-col auto-cols-[calc(50%-0.5rem)] md:auto-cols-[calc(33.333%-0.66rem)] lg:auto-cols-[calc(25%-0.75rem)] gap-3 overflow-x-auto pb-4 scrollbar-hide px-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {childTopics.map((topic) => {
            const gradient = COLOR_MAP[topic.color_hex] || 'from-primary-400 to-primary-600';
            const icon = ICON_MAP[topic.icon_url] || '📖';
            const isSelected = selectedTopicId === topic.id;
            const total = topic.total_words || 0;
            const learned = progressMap[topic.id] || 0;
            const progressPct = total > 0 ? Math.min(100, Math.round((learned / total) * 100)) : 0;

            let statusLabel = "";
            if (progressPct > 0 && progressPct < 100) statusLabel = "Đang học";
            else if (progressPct === 100) statusLabel = "Đã thuộc";

            return (
              <button
                key={topic.id}
                onClick={() => onSelectTopic(topic.id)}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col gap-3 relative overflow-hidden ${
                  isSelected
                    ? "border-primary-500 bg-primary-50/50 shadow-sm"
                    : "border-[var(--border-color)] bg-[var(--surface)] hover:border-primary-200 hover:bg-gray-50"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 text-primary-500 bg-white rounded-full">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-xl shadow-inner`}>
                  {icon}
                </div>
                <div>
                  <p className={`text-sm font-bold truncate ${isSelected ? "text-primary-700" : "text-foreground"}`}>{topic.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[11px] text-gray-500 font-medium">{total} từ</p>
                    {statusLabel && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary-100 text-primary-600">{statusLabel}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => childScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 p-2 bg-white border border-gray-200 rounded-full shadow-md text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-gray-50"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// Re-export maps for pages that need them
export { COLOR_MAP, ICON_MAP };
