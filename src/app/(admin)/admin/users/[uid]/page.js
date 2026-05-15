"use client";

import { useState, useEffect, use } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getUserDetail, getUserSubcollection, updateUserField } from "@/lib/adminService";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Zap,
  Flame,
  Trophy,
  Target,
  Clock,
  Shield,
  RefreshCw,
  Loader2,
  AlertTriangle,
  X,
} from "lucide-react";
import Link from "next/link";

function StatItem({ icon: Icon, label, value, color = "blue" }) {
  const colorMap = {
    blue: "text-blue-500 bg-blue-50",
    green: "text-emerald-500 bg-emerald-50",
    orange: "text-orange-500 bg-orange-50",
    red: "text-red-500 bg-red-50",
    purple: "text-purple-500 bg-purple-50",
  };
  const cls = colorMap[color] || colorMap.blue;

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-xl">
      <div className={`w-9 h-9 rounded-lg ${cls} flex items-center justify-center`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-lg font-bold text-foreground font-mono">{value}</p>
        <p className="text-[11px] text-gray-400">{label}</p>
      </div>
    </div>
  );
}

export default function UserDetailPage({ params }) {
  const resolvedParams = use(params);
  const uid = resolvedParams.uid;
  const { user: adminUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Tab data (lazy loaded)
  const [wordProgress, setWordProgress] = useState(null);
  const [quizHistory, setQuizHistory] = useState(null);
  const [studyTime, setStudyTime] = useState(null);
  const [badges, setBadges] = useState(null);

  // Admin actions
  const [resetConfirm, setResetConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Profile edit
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ dailyGoal: 10, learningLevel: "beginner" });

  function openProfileEdit() {
    setProfileForm({
      dailyGoal: userData.dailyGoal || 10,
      learningLevel: userData.learningLevel || "beginner",
    });
    setProfileOpen(true);
  }

  async function handleProfileSave(e) {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (profileForm.dailyGoal !== userData.dailyGoal) {
        await updateUserField(adminUser.uid, uid, "dailyGoal", parseInt(profileForm.dailyGoal));
      }
      if (profileForm.learningLevel !== userData.learningLevel) {
        await updateUserField(adminUser.uid, uid, "learningLevel", profileForm.learningLevel);
      }
      setProfileOpen(false);
      await loadUser();
    } catch(err) {
      alert("Lỗi: " + err.message);
    }
    setActionLoading(false);
  }

  useEffect(() => {
    loadUser();
  }, [uid]);

  async function loadUser() {
    setLoading(true);
    try {
      const data = await getUserDetail(uid);
      
      // Calculate real accuracy and reviews from wordProgress (like the mobile app and user profile)
      const { collection, getDocs } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      const progressRef = collection(db, "users", uid, "wordProgress");
      const progressSnap = await getDocs(progressRef);
      
      let realReviews = 0;
      let realLapses = 0;
      progressSnap.forEach(doc => {
        const p = doc.data();
        const rCount = p.review_count ?? p.reviewCount ?? 0;
        const lCount = p.lapses ?? 0;
        
        realReviews += rCount;
        realLapses += lCount;
      });
      
      data.totalReviews = realReviews;
      data.totalLapses = realLapses;
      
      setUserData(data);
    } catch (err) {
      console.error("Failed to load user:", err);
    }
    setLoading(false);
  }

  async function loadTab(tab) {
    setActiveTab(tab);
    switch (tab) {
      case "wordProgress":
        if (!wordProgress) {
          const result = await getUserSubcollection(uid, "wordProgress", {
            maxCount: 20,
            orderField: "updatedAt",
          });
          setWordProgress(result.items);
        }
        break;
      case "quizHistory":
        if (!quizHistory) {
          const result = await getUserSubcollection(uid, "quizResults", {
            maxCount: 20,
            orderField: "completedAt",
          });
          setQuizHistory(result.items);
        }
        break;
      case "studyTime":
        if (!studyTime) {
          const result = await getUserSubcollection(uid, "studyTimeHistory", {
            maxCount: 30,
            orderField: "date",
          });
          setStudyTime(result.items);
        }
        break;
      case "badges":
        if (!badges) {
          const result = await getUserSubcollection(uid, "badges", { maxCount: 50 });
          setBadges(result.items);
        }
        break;
    }
  }

  async function handleAdminAction() {
    if (!resetConfirm) return;
    setActionLoading(true);
    try {
      await updateUserField(adminUser.uid, uid, resetConfirm.field, resetConfirm.value);
      await loadUser();
    } catch (err) {
      console.error("Admin action failed:", err);
      alert("Lỗi: " + err.message);
    }
    setActionLoading(false);
    setResetConfirm(null);
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="max-w-5xl mx-auto text-center py-16">
        <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto mb-3" />
        <p className="text-lg font-semibold text-foreground">User không tìm thấy</p>
        <Link href="/admin/users" className="text-sm text-primary-500 mt-2 inline-block hover:underline">
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  const TABS = [
    { key: "overview", label: "Tổng quan" },
    { key: "wordProgress", label: "Word Progress" },
    { key: "quizHistory", label: "Quiz" },
    { key: "studyTime", label: "Study Time" },
    { key: "badges", label: "Badges" },
  ];

  const STATUS_MAP = { 0: "Mới", 1: "Đang học", 2: "Ôn tập", 3: "Thành thạo" };
  const STATUS_BADGE = { 0: "admin-badge-blue", 1: "admin-badge-orange", 2: "admin-badge-green", 3: "admin-badge-green" };

  const accuracy = userData.totalReviews > 0
    ? Math.round(((userData.totalReviews - (userData.totalLapses || 0)) / userData.totalReviews) * 100)
    : 100;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-500 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Danh sách users
      </Link>

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6"
      >
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {(userData.displayName || "U").substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground">{userData.displayName || "Unknown"}</h1>
              {userData.role === "admin" && (
                <span className="admin-badge admin-badge-blue"><Shield className="w-3 h-3" /> Admin</span>
              )}
              {userData.isBanned && (
                <span className="admin-badge admin-badge-red bg-red-100 text-red-700">Banned</span>
              )}
            </div>
            <p className="text-sm text-gray-500">{userData.email}</p>
            <p className="text-xs text-gray-400 mt-1">
              Tham gia: {userData.createdAt ? new Date(userData.createdAt?.toDate ? userData.createdAt.toDate() : userData.createdAt._seconds ? userData.createdAt._seconds * 1000 : userData.createdAt).toLocaleDateString("vi-VN") : "—"}
              {" "} • UID: <span className="font-mono">{uid.substring(0, 12)}...</span>
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
          <StatItem icon={Zap} label="XP" value={(userData.totalXp || 0).toLocaleString()} color="blue" />
          <StatItem icon={Flame} label="Streak" value={`${userData.currentStreak || 0} 🔥`} color="orange" />
          <StatItem icon={BookOpen} label="Đã học" value={userData.learnedWords || 0} color="green" />
          <StatItem icon={Target} label="Reviews" value={(userData.totalReviews || 0).toLocaleString()} color="purple" />
          <StatItem icon={Trophy} label="Accuracy" value={`${accuracy}%`} color="green" />
          <StatItem icon={RefreshCw} label="Source" value={userData.lastChangeSource || "—"} color="blue" />
        </div>
      </motion.div>

      {/* Admin Actions */}
      <div className="glass-panel p-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Admin Actions</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setResetConfirm({ field: "currentStreak", value: 0, label: "Reset Streak về 0" })}
            className="px-3 py-2 bg-orange-50 text-orange-600 text-xs font-semibold rounded-lg hover:bg-orange-100 cursor-pointer transition-colors"
          >
            Reset Streak
          </button>
          <button
            onClick={() => setResetConfirm({ field: "totalXp", value: 0, label: "Reset XP về 0" })}
            className="px-3 py-2 bg-red-50 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 cursor-pointer transition-colors"
          >
            Reset XP
          </button>
          <button
            onClick={openProfileEdit}
            className="px-3 py-2 bg-blue-50 text-blue-600 text-xs font-semibold rounded-lg hover:bg-blue-100 cursor-pointer transition-colors"
          >
            Edit Profile
          </button>
          <button
            onClick={() => setResetConfirm({ field: "isBanned", value: !userData.isBanned, label: userData.isBanned ? "Unban User này" : "Khoá tài khoản (Ban) User này" })}
            className={`px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
              userData.isBanned ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-red-50 text-red-600 hover:bg-red-100"
            }`}
          >
            {userData.isBanned ? "Unban User" : "Ban User"}
          </button>
          <button
            onClick={() => setResetConfirm({ field: "role", value: userData.role === "admin" ? "user" : "admin", label: `Cấp quyền ${userData.role === "admin" ? "User" : "Admin"}` })}
            className="px-3 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 cursor-pointer transition-colors ml-auto"
          >
            Toggle Role
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => loadTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === tab.key
                ? "bg-primary-500 text-white"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="glass-panel p-6">
        {activeTab === "overview" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-foreground">Thông tin chi tiết</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[
                ["Level", userData.level],
                ["Learning Level", userData.learningLevel],
                ["Daily Goal", userData.dailyGoal],
                ["Longest Streak", userData.longestStreak],
                ["Total Words", userData.totalWords],
                ["Total Lapses", userData.totalLapses],
                ["Last Study Date", userData.lastStudyDate],
                ["Last Synced", userData.lastSyncedAt ? new Date(
                  typeof userData.lastSyncedAt === "object" && userData.lastSyncedAt.toDate
                    ? userData.lastSyncedAt.toDate()
                    : userData.lastSyncedAt
                ).toLocaleString("vi-VN") : "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-border-color">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-mono font-semibold text-foreground">{value ?? "—"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "wordProgress" && (
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3">Word Progress (gần nhất 20)</h3>
            {wordProgress === null ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
            ) : wordProgress.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Chưa có dữ liệu</p>
            ) : (
              <div className="space-y-2">
                {wordProgress.map((wp) => (
                  <div key={wp.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                    <div>
                      <span className="text-sm font-mono text-foreground">{wp.wordId || wp.id}</span>
                      <span className={`ml-2 admin-badge ${STATUS_BADGE[wp.status] || "admin-badge-gray"}`}>
                        {STATUS_MAP[wp.status] || wp.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 space-x-3">
                      <span>EF: {wp.easinessFactor?.toFixed(2) || "—"}</span>
                      <span>R: {wp.reviewCount || 0}</span>
                      <span>L: {wp.lapses || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "quizHistory" && (
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3">Quiz Results (gần nhất 20)</h3>
            {quizHistory === null ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
            ) : quizHistory.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Chưa có quiz nào</p>
            ) : (
              <div className="space-y-2">
                {quizHistory.map((q) => (
                  <div key={q.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                    <div className="text-sm">
                      <span className="font-semibold text-foreground">{q.score || 0}%</span>
                      <span className="text-gray-400 ml-2">
                        {q.correctAnswers}/{q.totalQuestions} câu đúng
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{q.completedAt || "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "studyTime" && (
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3">Study Time (30 ngày gần nhất)</h3>
            {studyTime === null ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
            ) : studyTime.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Chưa có dữ liệu</p>
            ) : (
              <div className="space-y-2">
                {studyTime.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                    <span className="text-sm font-mono text-foreground">{s.date}</span>
                    <div className="text-xs text-gray-500">
                      <span className="font-semibold text-foreground">
                        {Math.floor((s.studyTimeSeconds || s.study_time_seconds || 0) / 60)} phút
                      </span>
                      {s.goalReached && <span className="ml-2 text-emerald-500">✓ Goal</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "badges" && (
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3">Badges</h3>
            {badges === null ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
            ) : badges.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Chưa có badge nào</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {badges.map((b) => (
                  <div key={b.id} className="p-3 bg-gray-50 rounded-xl text-center">
                    <p className="text-2xl mb-1">🏅</p>
                    <p className="text-xs font-semibold text-foreground">{b.badge_id || b.id}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {b.unlocked_at ? new Date(b.unlocked_at).toLocaleDateString("vi-VN") : "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!resetConfirm}
        onClose={() => setResetConfirm(null)}
        onConfirm={handleAdminAction}
        title="Admin Action"
        message={`Bạn có chắc muốn: ${resetConfirm?.label}?`}
        confirmText="Thực hiện"
        destructive={resetConfirm?.field !== "role"}
        loading={actionLoading}
      />

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {profileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setProfileOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm z-50 p-4">
              <div className="bg-surface-elevated rounded-2xl shadow-xl overflow-hidden border border-border-color">
                <div className="flex items-center justify-between p-4 border-b border-border-color">
                  <h3 className="font-bold text-foreground">Edit User Profile</h3>
                  <button onClick={() => setProfileOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer"><X className="w-4 h-4 text-gray-500" /></button>
                </div>
                <form onSubmit={handleProfileSave} className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Mục tiêu hằng ngày (Daily Goal)</label>
                    <input type="number" min="1" value={profileForm.dailyGoal} onChange={(e) => setProfileForm({ ...profileForm, dailyGoal: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:border-primary-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Cấp độ (Learning Level)</label>
                    <select value={profileForm.learningLevel} onChange={(e) => setProfileForm({ ...profileForm, learningLevel: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-sm outline-none cursor-pointer">
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button type="submit" disabled={actionLoading} className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 cursor-pointer disabled:opacity-50">
                      {actionLoading ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
