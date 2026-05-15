"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  getContentVersion, commitVersionBump, getAdminUsers,
  getDashboardStats, getAuditLogs, changeUserRole, getPendingRelease, getDraftItems, getUserDetail
} from "@/lib/adminService";
import { hasPermission, ROLE_LABELS, ROLE_COLORS, ROLES } from "@/lib/permissions";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { motion } from "framer-motion";
import {
  Settings, Zap, Database, Shield, Users, BookOpen, FolderTree,
  RefreshCw, Loader2, Clock, ArrowUpCircle, CheckCircle2, Crown, Eye, ChevronDown,
} from "lucide-react";

export default function SettingsPage() {
  const { user, userRole } = useAuth();
  const isSuperAdmin = userRole === ROLES.SUPERADMIN;
  const [contentVersion, setContentVersion] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [changelogs, setChangelogs] = useState([]);
  const [changelogAdmins, setChangelogAdmins] = useState({});
  const [loading, setLoading] = useState(true);
  const [bumpConfirm, setBumpConfirm] = useState(null);
  const [bumpLoading, setBumpLoading] = useState(false);
  const [bumpSuccess, setBumpSuccess] = useState(false);

  const [pendingRelease, setPendingRelease] = useState(null);
  const [draftDetail, setDraftDetail] = useState(null); // { draftTopics, draftWords }
  const [draftLoading, setDraftLoading] = useState(false);
  const [showDraftDetail, setShowDraftDetail] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const [cv, admins, st, logs, pending] = await Promise.all([
        getContentVersion(),
        getAdminUsers(),
        getDashboardStats(),
        getAuditLogs({ actionFilter: "PUBLISH_RELEASE", maxCount: 10 }),
        getPendingRelease()
      ]);
      setContentVersion(cv);
      setAdminUsers(admins);
      setStats(st);
      setChangelogs(logs);
      setPendingRelease(pending);

      // Resolve admin names for changelog
      const uids = [...new Set(logs.map(l => l.adminUid).filter(Boolean))];
      const names = { ...changelogAdmins };
      for (const uid of uids) {
        if (!names[uid]) {
          try { const u = await getUserDetail(uid); names[uid] = u?.displayName || uid.substring(0, 8); } catch {}
        }
      }
      setChangelogAdmins(names);
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
    setLoading(false);
  }

  async function handleBump() {
    if (!bumpConfirm) return;
    setBumpLoading(true);
    try {
      await commitVersionBump(user.uid);
      await loadSettings(); // Reload to get new cv and changelogs
      setBumpSuccess(true);
      setTimeout(() => setBumpSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to publish version:", err);
      alert("Lỗi: " + err.message);
    }
    setBumpLoading(false);
    setBumpConfirm(null);
  }

  async function handleLoadDraftDetail() {
    if (showDraftDetail) {
      setShowDraftDetail(false);
      return;
    }
    setDraftLoading(true);
    try {
      const detail = await getDraftItems();
      setDraftDetail(detail);
      setShowDraftDetail(true);
    } catch (err) {
      console.error("Failed to load draft detail:", err);
    }
    setDraftLoading(false);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Đang tải cài đặt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Cài đặt hệ thống</h1>
        <p className="text-sm text-gray-500 mt-1">Quản lý content version, thông tin hệ thống và admin</p>
      </motion.div>

      {/* Section 1: Pending Release & Content Version */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-panel p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Pending Release & Content Version</h2>
              <p className="text-xs text-gray-500">Quản lý và xuất bản các thay đổi nội dung (Draft ➔ Publish)</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <div className="text-blue-600">Words Ver: <span className="text-lg font-mono">{contentVersion?.wordsVersion ?? 0}</span></div>
            <div className="text-purple-600">Topics Ver: <span className="text-lg font-mono">{contentVersion?.topicsVersion ?? 0}</span></div>
          </div>
        </div>

        {bumpSuccess && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 animate-slide-in-up">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-700">Đã xuất bản thành công tới người dùng!</span>
          </div>
        )}

        <div className="mt-4 border border-gray-100 rounded-2xl overflow-hidden">
          <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-gray-400" />
              Dữ liệu đang chờ xuất bản
            </span>
            {pendingRelease && (pendingRelease.pendingTopicsCount > 0 || pendingRelease.pendingWordsCount > 0) ? (
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">Có thay đổi mới</span>
            ) : (
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Đã đồng bộ</span>
            )}
          </div>
          
          <div className="p-5 bg-white">
            {(!pendingRelease || (pendingRelease.pendingTopicsCount === 0 && pendingRelease.pendingWordsCount === 0)) ? (
              <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                <CheckCircle2 className="w-10 h-10 mb-2 text-gray-200" />
                <p className="text-sm font-medium">Hệ thống đang đồng bộ.</p>
                <p className="text-xs">Không có thay đổi nào đang chờ xuất bản.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <button
                    onClick={handleLoadDraftDetail}
                    className="flex-1 p-3 bg-purple-50 rounded-xl border border-purple-100 text-left hover:bg-purple-100/70 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-600 uppercase">Chủ đề thay đổi</span>
                      <Eye className="w-3.5 h-3.5 text-purple-300 group-hover:text-purple-500 transition-colors" />
                    </div>
                    <p className="text-2xl font-bold text-purple-700 mt-1">{pendingRelease.pendingTopicsCount}</p>
                  </button>
                  <button
                    onClick={handleLoadDraftDetail}
                    className="flex-1 p-3 bg-blue-50 rounded-xl border border-blue-100 text-left hover:bg-blue-100/70 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-600 uppercase">Từ vựng thay đổi</span>
                      <Eye className="w-3.5 h-3.5 text-blue-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <p className="text-2xl font-bold text-blue-700 mt-1">{pendingRelease.pendingWordsCount}</p>
                  </button>
                </div>

                {/* Draft Detail Panel */}
                {draftLoading && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                    <span className="text-xs text-gray-400 ml-2">Đang tải chi tiết...</span>
                  </div>
                )}
                {showDraftDetail && draftDetail && !draftLoading && (
                  <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setShowDraftDetail(false)}
                      className="w-full bg-gray-50/80 px-4 py-2 text-xs font-bold text-gray-500 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <span>▼ Chi tiết dữ liệu chờ xuất bản</span>
                      <span className="text-gray-400">Bấm để ẩn</span>
                    </button>
                    <div className="p-4 bg-white max-h-[300px] overflow-y-auto space-y-4">
                      {draftDetail.draftTopics.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-purple-600 uppercase mb-2 flex items-center gap-1.5">
                            <FolderTree className="w-3.5 h-3.5" />
                            Chủ đề ({draftDetail.draftTopics.length})
                          </p>
                          <div className="space-y-1">
                            {draftDetail.draftTopics.map(t => (
                              <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 bg-purple-50/50 rounded-lg">
                                <span className="text-sm font-medium text-foreground">{t.name}</span>
                                {t.parent_id && <span className="text-[10px] text-purple-400 bg-purple-100 px-1.5 py-0.5 rounded">con</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {draftDetail.draftWords.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-blue-600 uppercase mb-2 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5" />
                            Từ vựng ({draftDetail.draftWords.length}{draftDetail.draftWords.length >= 200 ? '+' : ''})
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                            {draftDetail.draftWords.map(w => (
                              <div key={w.id} className="px-2.5 py-1.5 bg-blue-50/50 rounded-lg">
                                <span className="text-xs font-semibold text-foreground">{w.word}</span>
                                <span className="text-[10px] text-gray-400 ml-1.5">{w.meaning}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {pendingRelease.changesSummary && pendingRelease.changesSummary.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Lịch sử thao tác (Release Notes):</p>
                    <div className="bg-gray-50 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1.5 border border-gray-100">
                      {[...pendingRelease.changesSummary].reverse().map((log, idx) => (
                        <div key={idx} className="text-xs text-gray-600 font-mono">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => setBumpConfirm("all")}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all cursor-pointer"
                  >
                    <ArrowUpCircle className="w-5 h-5" />
                    PUBLISH & BUMP VERSION
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Section 2: System Info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Thông tin hệ thống</h2>
              <p className="text-xs text-gray-400">Tổng quan dữ liệu trong Firestore</p>
            </div>
          </div>
          <button onClick={loadSettings} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" />
            Làm mới
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50/50 border border-gray-100">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground font-mono">{(stats?.totalUsers ?? 0).toLocaleString()}</p>
              <p className="text-[11px] text-gray-400">Users</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50/50 border border-gray-100">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground font-mono">{(stats?.totalWords ?? 0).toLocaleString()}</p>
              <p className="text-[11px] text-gray-400">Từ vựng</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50/50 border border-gray-100">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <FolderTree className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground font-mono">{(stats?.totalTopics ?? 0).toLocaleString()}</p>
              <p className="text-[11px] text-gray-400">Chủ đề</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50/50 border border-gray-100">
            <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
              <Zap className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground font-mono">{(stats?.activeToday ?? 0).toLocaleString()}</p>
              <p className="text-[11px] text-gray-400">Active hôm nay</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Section 3: Admin Role Management (superadmin only) */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Quản lý Admin</h2>
            <p className="text-xs text-gray-400">{adminUsers.length} tài khoản có quyền quản trị</p>
          </div>
        </div>

        {adminUsers.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Không tìm thấy admin nào</p>
        ) : (
          <div className="space-y-2">
            {adminUsers.map((admin) => {
              const rc = ROLE_COLORS[admin.role] || ROLE_COLORS.user;
              const isMe = admin.id === user?.uid;
              return (
                <div key={admin.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {(admin.displayName || "A").substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {admin.displayName}
                      {isMe && <span className="text-xs text-gray-400 ml-1.5">(bạn)</span>}
                    </p>
                    <p className="text-xs text-gray-400">{admin.email}</p>
                  </div>
                  {isSuperAdmin && !isMe ? (
                    <select
                      value={admin.role}
                      onChange={async (e) => {
                        const newRole = e.target.value;
                        if (confirm(`Đổi role của ${admin.displayName} thành ${ROLE_LABELS[newRole]}?`)) {
                          try {
                            await changeUserRole(user.uid, admin.id, newRole);
                            await loadSettings();
                          } catch (err) {
                            alert("Lỗi: " + err.message);
                          }
                        }
                      }}
                      className="px-3 py-1.5 bg-surface border border-border-color rounded-lg text-xs font-semibold cursor-pointer outline-none"
                    >
                      <option value="superadmin">👑 Super Admin</option>
                      <option value="admin">🛡️ Admin</option>
                      <option value="editor">✏️ Editor</option>
                      <option value="user">👤 User (revoke)</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${rc.bg} ${rc.text} border ${rc.border}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${rc.dot}`} />
                      {ROLE_LABELS[admin.role] || admin.role}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-border-color">
          {isSuperAdmin
            ? "👑 Bạn là Super Admin — có thể thay đổi role của bất kỳ admin nào khác."
            : "🔒 Chỉ Super Admin mới có thể thay đổi role. Liên hệ Super Admin nếu cần."}
        </p>
      </motion.div>

      {/* Section 4: Changelog */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-slate-500 flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Lịch sử Cập nhật (Changelog)</h2>
            <p className="text-xs text-gray-400">10 lần Bump Version gần nhất</p>
          </div>
        </div>

        {changelogs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Chưa có lịch sử bump version</p>
        ) : (
          <div className="divide-y divide-border-color">
            {changelogs.map((log) => {
              const adminName = changelogAdmins[log.adminUid] || log.adminUid?.substring(0, 8) || "System";
              const d = log.details || {};
              const topicsCount = d.topicsCount || d.pendingTopicsCount || 0;
              const wordsCount = d.wordsCount || d.pendingWordsCount || 0;
              const summaryNotes = d.summary || d.changesSummary || [];
              return (
                <div key={log.id} className="py-4 flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                    {adminName[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">Xuất bản dữ liệu</p>
                      <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        Words v{d.wordsVersion || d.wordsVersionAssigned || "-"} • Topics v{d.topicsVersion || d.topicsVersionAssigned || "-"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      bởi <span className="font-semibold text-foreground">{adminName}</span>
                      {(topicsCount > 0 || wordsCount > 0) && (
                        <span className="ml-1.5">— {topicsCount > 0 && `${topicsCount} chủ đề`}{topicsCount > 0 && wordsCount > 0 && ", "}{wordsCount > 0 && `${wordsCount} từ vựng`}</span>
                      )}
                    </p>
                    {summaryNotes.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {summaryNotes.slice(-3).map((note, idx) => (
                          <p key={idx} className="text-[11px] text-gray-400 font-mono truncate">{note}</p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleString("vi-VN", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Publish Confirm */}
      <ConfirmDialog
        open={!!bumpConfirm}
        onClose={() => setBumpConfirm(null)}
        onConfirm={handleBump}
        title="Publish Release"
        message="Bạn có chắc muốn xuất bản toàn bộ dữ liệu đang chờ (Draft) tới người dùng? Tất cả mobile clients sẽ cập nhật dữ liệu khi mở app."
        confirmText="Xuất bản"
        destructive={false}
        loading={bumpLoading}
      />
    </div>
  );
}
