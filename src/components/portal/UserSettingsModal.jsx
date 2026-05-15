"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, CheckCircle2, Shield, Crown } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function UserSettingsModal({ isOpen, onClose, initialTab = "profile" }) {
  const { user, userData } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [copied, setCopied] = useState(false);

  // Settings State
  const [topics, setTopics] = useState({
    "Du lịch": false,
    "Giáo dục": false,
    "Kinh doanh": false,
    "Giải trí": false,
    "Xã hội": false,
    "Thể thao": false,
  });

  const [learningLevel, setLearningLevel] = useState("beginner");
  const [dailyGoal, setDailyGoal] = useState(15);
  const [mounted, setMounted] = useState(false);
  const [availableTopics, setAvailableTopics] = useState([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadTopics() {
      try {
        const { getTopics } = await import("@/lib/firestoreService");
        const topicsData = await getTopics();
        const parents = topicsData.filter(t => !t.parent_id);
        setAvailableTopics(parents);
      } catch (err) {
        console.error("Failed to load topics", err);
      }
    }
    if (isOpen) {
      setActiveTab(initialTab);
      loadTopics();
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (userData) {
      setLearningLevel(userData.learningLevel || "beginner");
      setDailyGoal(userData.dailyGoal || 15);
    }
  }, [userData]);

  const updateLearningProfile = async (field, value) => {
    if (field === "learningLevel") setLearningLevel(value);
    if (field === "dailyGoal") setDailyGoal(value);

    if (user?.uid) {
      try {
        const { doc, updateDoc } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        
        const updates = { [field]: value };
        if (field === "learningLevel") updates["learning_level"] = value;
        if (field === "dailyGoal") updates["daily_goal"] = value;

        await updateDoc(doc(db, "users", user.uid), updates);
      } catch (err) {
        console.error("Failed to update learning profile", err);
      }
    }
  };

  useEffect(() => {
    if (userData?.selectedTopics) {
      const initialTopics = {
        "Du lịch": false,
        "Giáo dục": false,
        "Kinh doanh": false,
        "Giải trí": false,
        "Xã hội": false,
        "Thể thao": false,
      };
      userData.selectedTopics.forEach(t => {
        if (initialTopics.hasOwnProperty(t)) {
          initialTopics[t] = true;
        }
      });
      setTopics(initialTopics);
    }
  }, [userData?.selectedTopics]);

  if (!mounted) return null;

  const displayName = userData?.displayName || user?.displayName || user?.email?.split("@")[0] || "User";
  const avatarInitials = displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const handleCopyId = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleTopic = async (topic) => {
    const nextState = { ...topics, [topic]: !topics[topic] };
    setTopics(nextState);

    // Save to Firestore
    if (user?.uid) {
      try {
        const { doc, updateDoc } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        
        const newTopicsArray = Object.keys(nextState).filter(k => nextState[k]);
        await updateDoc(doc(db, "users", user.uid), {
          selectedTopics: newTopicsArray,
          selected_topics: newTopicsArray,
        });
      } catch (err) {
        console.error("Failed to update topics", err);
      }
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="px-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab("profile")}
                className={`py-4 text-sm font-bold border-b-2 transition-colors ${
                  activeTab === "profile"
                    ? "border-primary-500 text-primary-600 dark:text-primary-400"
                    : "border-transparent text-gray-500 hover:text-foreground"
                }`}
              >
                Thông tin cá nhân
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`py-4 text-sm font-bold border-b-2 transition-colors ${
                  activeTab === "settings"
                    ? "border-primary-500 text-primary-600 dark:text-primary-400"
                    : "border-transparent text-gray-500 hover:text-foreground"
                }`}
              >
                Cài đặt
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {activeTab === "profile" && (
              <div className="flex flex-col sm:flex-row gap-8">
                {/* Left: Avatar */}
                <div className="flex flex-col items-center gap-3">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center relative group">
                    {userData?.avatar ? (
                      <img src={userData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-extrabold text-white">{avatarInitials}</span>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      <span className="text-white text-xs font-bold">Thay ảnh</span>
                    </div>
                  </div>
                  <button className="text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-primary-600 transition-colors">
                    Chỉnh sửa
                  </button>
                </div>

                {/* Right: Info Fields */}
                <div className="flex-1 space-y-6">
                  {/* Name */}
                  <div className="border-b border-gray-100 dark:border-slate-800 pb-4">
                    <p className="text-xs font-bold text-gray-500 mb-1">Họ và tên</p>
                    <p className="text-sm font-semibold text-foreground mb-2">{displayName}</p>
                    <button className="text-[13px] font-bold text-primary-600 hover:underline">
                      Thay đổi tên
                    </button>
                  </div>

                  {/* ID */}
                  <div className="border-b border-gray-100 dark:border-slate-800 pb-4">
                    <p className="text-xs font-bold text-gray-500 mb-1">ID của bạn</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded">
                        ID: {user?.uid?.substring(0, 10)}...
                      </span>
                      <button
                        onClick={handleCopyId}
                        className="p-1.5 text-gray-400 hover:text-primary-500 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
                        title="Copy ID"
                      >
                        {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Upgrade */}
                  <div className="border-b border-gray-100 dark:border-slate-800 pb-4">
                    <p className="text-xs font-bold text-gray-500 mb-2">Gói nâng cấp</p>
                    <button className="flex items-center gap-2 text-[13px] font-bold text-amber-500 hover:text-amber-600 hover:underline">
                      <Crown className="w-4 h-4" /> Nâng cấp PRO
                    </button>
                  </div>

                  {/* Email */}
                  <div className="border-b border-gray-100 dark:border-slate-800 pb-4">
                    <p className="text-xs font-bold text-gray-500 mb-1">Email</p>
                    <p className="text-sm text-foreground mb-1">{user?.email}</p>
                    <p className="text-xs text-gray-400">Quản lý bởi Google</p>
                  </div>

                  {/* Account Actions */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-3">Tài khoản</p>
                    <div className="space-y-3">
                      <button className="block text-[13px] font-bold text-blue-600 hover:underline">
                        Đổi mật khẩu
                      </button>
                      <button className="block text-[13px] font-bold text-red-500 hover:underline">
                        Xóa tài khoản
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="max-w-2xl space-y-8">
                {/* Language */}
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-3">Ngôn ngữ mẹ đẻ</h3>
                  <select className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-primary-500 outline-none">
                    <option value="vi">Vietnamese (Vietnam)</option>
                    <option value="en">English (US)</option>
                  </select>
                </div>

                {/* Profile */}
                <div className="border-t border-gray-100 dark:border-slate-800 pt-6">
                  <h3 className="text-sm font-bold text-foreground mb-4">Hồ sơ học tập</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Trình độ</p>
                      <select 
                        value={learningLevel}
                        onChange={(e) => updateLearningProfile("learningLevel", e.target.value)}
                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-primary-500 outline-none"
                      >
                        <option value="beginner">Mới bắt đầu</option>
                        <option value="intermediate">Trung cấp</option>
                        <option value="advanced">Cao cấp</option>
                      </select>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Mục tiêu mỗi ngày</p>
                      <select 
                        value={dailyGoal}
                        onChange={(e) => updateLearningProfile("dailyGoal", Number(e.target.value))}
                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-primary-500 outline-none"
                      >
                        <option value={15}>15 từ / ngày</option>
                        <option value={20}>20 từ / ngày</option>
                        <option value={30}>30 từ / ngày</option>
                        <option value={50}>50 từ / ngày</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Topics */}
                <div className="border-t border-gray-100 dark:border-slate-800 pt-6">
                  <h3 className="text-sm font-bold text-foreground mb-4">Chủ đề quan tâm</h3>
                  <p className="text-xs text-gray-500 mb-4">Chọn chủ đề</p>
                  
                  {availableTopics.length === 0 ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {availableTopics.map(topic => {
                        const active = topics[topic.id] || false;
                        return (
                          <label key={topic.id} className="flex items-center gap-3 cursor-pointer group">
                            <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${active ? "bg-primary-500" : "bg-gray-200 dark:bg-slate-700"}`}>
                              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${active ? "translate-x-5" : "translate-x-1"}`} />
                            </div>
                            <span className="text-sm text-foreground group-hover:text-primary-600 transition-colors line-clamp-1">
                              {topic.name}
                            </span>
                            <input type="checkbox" className="hidden" checked={active} onChange={() => toggleTopic(topic.id)} />
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
