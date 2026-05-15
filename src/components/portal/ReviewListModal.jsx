"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Clock, Calendar as CalendarIcon, Volume2, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { getAllWordProgressWithDetails, toggleDifficultWord } from "@/lib/firestoreService";

export default function ReviewListModal({ isOpen, onClose, words = [], onStartReview }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("today"); // "today" | "history"
  const [historyWords, setHistoryWords] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Function to fetch history data
  const fetchHistory = async () => {
    if (!user?.uid) return;
    setLoadingHistory(true);
    try {
      const allProgress = await getAllWordProgressWithDetails(user.uid);
      setHistoryWords(allProgress);
    } catch (error) {
      console.error("Lỗi lấy lịch sử:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === "history" && historyWords.length === 0) {
      fetchHistory();
    }
  }, [isOpen, activeTab]);

  // Audio function
  const playAudio = (text) => {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  // Toggle Bookmark
  const handleToggleDifficult = async (e, w) => {
    e.stopPropagation();
    if (!user?.uid) return;
    try {
      // Optimistic UI update can be added here if we had local state for words, 
      // but for simplicity we just toggle in backend.
      await toggleDifficultWord(user.uid, w.id, {
        word: w.word,
        meaning: w.meaning,
        pronunciation: w.pronunciation
      });
      // In a real app, you might update the state here to show the star as filled immediately
      // For now, we rely on the next refresh to show the change.
      alert(`Đã ${w.isDifficult ? 'bỏ lưu' : 'lưu'} từ: ${w.word}`);
    } catch (err) {
      console.error("Lỗi khi lưu từ:", err);
    }
  };

  // Date manipulation
  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  // Format YYYY-MM-DD
  const getLocalYMD = (d) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getLocalYMDFromISO = (isoString) => {
    if (!isoString) return '';
    // Xử lý Timestamp của Firebase (seconds, nanoseconds)
    if (isoString.seconds) {
      return getLocalYMD(new Date(isoString.seconds * 1000));
    }
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return getLocalYMD(d);
  };

  const selectedDateStr = getLocalYMD(selectedDate);
  const isTodayDate = selectedDateStr === getLocalYMD(new Date());

  // Filter history
  const learnedOnDate = historyWords.filter(w => {
    const fld = w.firstLearnedDate || w.first_learned_date;
    return getLocalYMDFromISO(fld) === selectedDateStr;
  });

  const reviewedOnDate = historyWords.filter(w => {
    const lrd = w.lastReviewDate || w.last_review_date;
    const fld = w.firstLearnedDate || w.first_learned_date;
    const reviewDateStr = getLocalYMDFromISO(lrd);
    const learnedDateStr = getLocalYMDFromISO(fld);
    return reviewDateStr === selectedDateStr && learnedDateStr !== selectedDateStr;
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-3xl bg-white dark:bg-dark-surface rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex flex-col p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>🧠</span> Ôn tập & Lịch sử
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-white dark:bg-white/5 rounded-full shadow-sm hover:shadow transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-200/50 dark:bg-white/10 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab("today")}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  activeTab === "today"
                    ? "bg-white dark:bg-primary-600 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                Cần ôn hôm nay ({words.length})
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  activeTab === "history"
                    ? "bg-white dark:bg-primary-600 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                Lịch sử học tập
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-transparent">
            {activeTab === "today" ? (
              // TAB: TODAY'S REVIEWS
              words.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🎉</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tuyệt vời!</h3>
                  <p className="text-gray-500 dark:text-gray-400">Bạn đã hoàn thành tất cả từ vựng cần ôn hôm nay.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {words.map((w) => <WordCard key={w.id} w={w} playAudio={playAudio} toggleDifficult={handleToggleDifficult} />)}
                </div>
              )
            ) : (
              // TAB: HISTORY
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-white dark:bg-white/5 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-white/10">
                  <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                    <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                  <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-white">
                    <CalendarIcon className="w-5 h-5 text-primary-500" />
                    <span>{isTodayDate ? "Hôm nay" : selectedDate.toLocaleDateString('vi-VN')}</span>
                  </div>
                  <button onClick={() => changeDate(1)} disabled={isTodayDate} className={`p-2 rounded-lg transition-colors ${isTodayDate ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-white/10'}`}>
                    <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>

                {loadingHistory ? (
                  <div className="text-center py-10"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <h3 className="font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-white/10 pb-2">
                        Từ mới đã học ({learnedOnDate.length})
                      </h3>
                      {learnedOnDate.length === 0 ? (
                        <p className="text-gray-500 text-sm italic">Không học từ mới nào trong ngày này.</p>
                      ) : (
                        <div className="space-y-3">
                          {learnedOnDate.map((w) => <WordCard key={w.id} w={w} playAudio={playAudio} toggleDifficult={handleToggleDifficult} />)}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 pt-4">
                      <h3 className="font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-white/10 pb-2">
                        Từ đã ôn tập ({reviewedOnDate.length})
                      </h3>
                      {reviewedOnDate.length === 0 ? (
                        <p className="text-gray-500 text-sm italic">Không ôn tập từ nào trong ngày này.</p>
                      ) : (
                        <div className="space-y-3">
                          {reviewedOnDate.map((w) => <WordCard key={w.id} w={w} playAudio={playAudio} toggleDifficult={handleToggleDifficult} />)}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {activeTab === "today" && words.length > 0 && (
            <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-white dark:bg-dark-surface">
              <button
                onClick={onStartReview}
                className="w-full flex items-center justify-center gap-2 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-lg transition-colors shadow-lg shadow-primary-500/30"
              >
                <Play className="w-5 h-5" fill="currentColor" /> Bắt đầu ôn tập ({words.length})
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Sub-component for displaying a single word
function WordCard({ w, playAudio, toggleDifficult }) {
  let statusColor = "text-gray-500 bg-gray-100 dark:bg-white/10";
  let statusLabel = "Đang học";
  if (w.status === 3 || w.intervalDays > 21) {
    statusColor = "text-green-600 bg-green-100 dark:bg-green-500/20";
    statusLabel = "Đã thuộc";
  } else if (w.status === 2 || w.intervalDays > 7) {
    statusColor = "text-blue-600 bg-blue-100 dark:bg-blue-500/20";
    statusLabel = "Đang ôn";
  } else if (w.status === 1) {
    statusColor = "text-orange-600 bg-orange-100 dark:bg-orange-500/20";
    statusLabel = "Mới học";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-shadow group relative"
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-bold text-lg text-gray-900 dark:text-white">
            {w.word || w.id}
          </h4>
          {w.pronunciation && (
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {w.pronunciation}
            </span>
          )}
          {w.word && (
            <button 
              onClick={() => playAudio(w.word)} 
              className="p-1 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/20 rounded-full transition-colors"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          {w.meaning || "Đang cập nhật..."}
        </p>
      </div>

      <div className="flex items-center gap-3 sm:justify-end">
        <button
          onClick={(e) => toggleDifficult(e, w)}
          className={`p-2 rounded-full transition-colors ${w.isDifficult || w.is_difficult ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-500/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-yellow-500'}`}
        >
          <Star className="w-5 h-5" fill={w.isDifficult || w.is_difficult ? "currentColor" : "none"} />
        </button>
        <div className={`px-2.5 py-1 rounded-md text-xs font-semibold ${statusColor}`}>
          {statusLabel}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 px-2.5 py-1 rounded-md border border-gray-100 dark:border-white/5">
          <Clock className="w-3.5 h-3.5" />
          <span>Chu kỳ: {w.intervalDays || w.interval_days || 1}d</span>
        </div>
      </div>
    </motion.div>
  );
}
