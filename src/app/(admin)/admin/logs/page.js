"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuditLogs, getUserDetail } from "@/lib/adminService";
import { motion } from "framer-motion";
import {
  Plus, Pencil, Trash2, UserCog, FolderPlus, Upload, RotateCcw,
  RefreshCw, Activity, Loader2, Search, Filter, Calendar, X,
  ClipboardList, Zap, ChevronDown, Shield, Flag, Megaphone, Rocket,
  MessageSquare, Copy, Check, ToggleLeft,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";

const ACTION_MAP = {
  CREATE_WORD: { icon: Plus, label: "Tạo từ mới", color: "text-emerald-500", bg: "bg-emerald-50" },
  UPDATE_WORD: { icon: Pencil, label: "Sửa từ", color: "text-blue-500", bg: "bg-blue-50" },
  SOFT_DELETE_WORD: { icon: Trash2, label: "Xoá từ", color: "text-red-500", bg: "bg-red-50" },
  RESTORE_WORD: { icon: RotateCcw, label: "Khôi phục từ", color: "text-emerald-500", bg: "bg-emerald-50" },
  CREATE_TOPIC: { icon: FolderPlus, label: "Tạo chủ đề", color: "text-purple-500", bg: "bg-purple-50" },
  UPDATE_TOPIC: { icon: Pencil, label: "Sửa chủ đề", color: "text-blue-500", bg: "bg-blue-50" },
  DELETE_TOPIC: { icon: Trash2, label: "Xoá chủ đề", color: "text-red-500", bg: "bg-red-50" },
  REORDER_TOPICS: { icon: RefreshCw, label: "Sắp xếp chủ đề", color: "text-orange-500", bg: "bg-orange-50" },
  UPDATE_USER: { icon: UserCog, label: "Cập nhật user", color: "text-orange-500", bg: "bg-orange-50" },
  BATCH_IMPORT: { icon: Upload, label: "Import hàng loạt", color: "text-purple-500", bg: "bg-purple-50" },
  BUMP_VERSION: { icon: Zap, label: "Bump version", color: "text-teal-500", bg: "bg-teal-50" },
  CHANGE_ROLE: { icon: Shield, label: "Đổi vai trò", color: "text-amber-500", bg: "bg-amber-50" },
  TOGGLE_FLAG: { icon: ToggleLeft, label: "Đổi Feature Flag", color: "text-cyan-500", bg: "bg-cyan-50" },
  CREATE_FLAG: { icon: Flag, label: "Tạo Feature Flag", color: "text-cyan-500", bg: "bg-cyan-50" },
  DELETE_FLAG: { icon: Trash2, label: "Xoá Feature Flag", color: "text-red-500", bg: "bg-red-50" },
  CREATE_ANNOUNCEMENT: { icon: Megaphone, label: "Tạo thông báo", color: "text-pink-500", bg: "bg-pink-50" },
  UPDATE_ANNOUNCEMENT: { icon: Pencil, label: "Sửa thông báo", color: "text-blue-500", bg: "bg-blue-50" },
  DELETE_ANNOUNCEMENT: { icon: Trash2, label: "Xoá thông báo", color: "text-red-500", bg: "bg-red-50" },
  PUBLISH_RELEASE: { icon: Rocket, label: "Phát hành bản cập nhật", color: "text-indigo-500", bg: "bg-indigo-50" },
  UPDATE_FEEDBACK: { icon: MessageSquare, label: "Cập nhật phản hồi", color: "text-sky-500", bg: "bg-sky-50" },
};

const ALL_ACTIONS = Object.keys(ACTION_MAP);

function formatTimestamp(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  return d.toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function timeAgo(isoStr) {
  if (!isoStr) return "";
  const diffMin = Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000);
  if (diffMin < 1) return "vừa xong";
  if (diffMin < 60) return `${diffMin}p trước`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h trước`;
  return `${Math.floor(diffHr / 24)}d trước`;
}

function getDetailText(action, details) {
  if (!details) return "";
  switch (action) {
    case "CREATE_WORD": case "SOFT_DELETE_WORD": case "RESTORE_WORD":
      return details.word ? `"${details.word}"` : "";
    case "UPDATE_WORD":
      return details.word ? `"${details.word}" → ${details.changedFields?.join(", ") || ""}` : "";
    case "CREATE_TOPIC": case "DELETE_TOPIC":
      return details.name ? `"${details.name}"` : "";
    case "UPDATE_TOPIC":
      return details.changedFields?.join(", ") || "";
    case "UPDATE_USER": case "CHANGE_ROLE":
      return `${details.field || "role"}: ${details.before} → ${details.after}`;
    case "BATCH_IMPORT":
      return `${details.imported} từ, ${details.errors || 0} lỗi`;
    case "BUMP_VERSION":
      return `type: ${details.type || "both"}`;
    case "TOGGLE_FLAG":
      return `${details.flag || ""}: ${details.before ? "ON" : "OFF"} → ${details.after ? "ON" : "OFF"}`;
    case "CREATE_FLAG": case "DELETE_FLAG":
      return details.label || details.flag || "";
    case "CREATE_ANNOUNCEMENT": case "UPDATE_ANNOUNCEMENT": case "DELETE_ANNOUNCEMENT":
      return details.title ? `"${details.title}"` : "";
    case "PUBLISH_RELEASE":
      return details.summary || "";
    case "UPDATE_FEEDBACK":
      return details.status ? `→ ${details.status}` : "";
    default:
      return JSON.stringify(details).slice(0, 80);
  }
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxCount, setMaxCount] = useState(50);
  const [expandedLog, setExpandedLog] = useState(null);
  const [adminNames, setAdminNames] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs({
        maxCount,
        actionFilter: actionFilter || null,
        startDate: startDate || null,
        endDate: endDate || null,
      });
      setLogs(data);

      // Resolve Admin Names
      const uids = [...new Set(data.map(l => l.adminUid).filter(Boolean))];
      const newNames = { ...adminNames };
      let changed = false;
      for (const uid of uids) {
        if (!newNames[uid]) {
          try {
            const u = await getUserDetail(uid);
            newNames[uid] = u?.displayName || uid.substring(0, 8);
            changed = true;
          } catch(e) {}
        }
      }
      if (changed) setAdminNames(newNames);

    } catch (err) {
      console.error("Failed to load audit logs:", err);
    }
    setLoading(false);
  }, [maxCount, actionFilter, startDate, endDate, adminNames]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const filteredLogs = searchQuery.trim()
    ? logs.filter((log) => {
        const q = searchQuery.toLowerCase();
        const detail = getDetailText(log.action, log.details).toLowerCase();
        const label = (ACTION_MAP[log.action]?.label || log.action).toLowerCase();
        return detail.includes(q) || label.includes(q);
      })
    : logs;

  const hasFilters = actionFilter || startDate || endDate || searchQuery;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-1">Lịch sử hành động admin • {filteredLogs.length} bản ghi</p>
        </div>
        <button onClick={loadLogs} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-surface border border-border-color rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Làm mới</span>
        </button>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-panel p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              <Filter className="w-3 h-3 inline mr-1" />Loại hành động
            </label>
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="w-full px-3 py-2 bg-surface border border-border-color rounded-xl text-sm outline-none cursor-pointer">
              <option value="">Tất cả</option>
              {ALL_ACTIONS.map((a) => <option key={a} value={a}>{ACTION_MAP[a].label}</option>)}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              <Calendar className="w-3 h-3 inline mr-1" />Từ ngày
            </label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 bg-surface border border-border-color rounded-xl text-sm outline-none" />
          </div>
          <div className="min-w-[140px]">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Đến ngày</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 bg-surface border border-border-color rounded-xl text-sm outline-none" />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              <Search className="w-3 h-3 inline mr-1" />Tìm kiếm
            </label>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm theo từ, tên..." className="w-full px-3 py-2 bg-surface border border-border-color rounded-xl text-sm outline-none placeholder-gray-400" />
          </div>
          {hasFilters && (
            <button onClick={() => { setActionFilter(""); setStartDate(""); setEndDate(""); setSearchQuery(""); }} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors cursor-pointer">
              <X className="w-3.5 h-3.5" />Xoá filter
            </button>
          )}
        </div>
      </motion.div>

      {/* Log List */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">{hasFilters ? "Không tìm thấy log phù hợp" : "Chưa có audit log nào"}</p>
          </div>
        ) : (
          <div className="divide-y divide-border-color">
             {filteredLogs.map((log, i) => {
              const config = ACTION_MAP[log.action] || { icon: Activity, label: log.action, color: "text-gray-500", bg: "bg-gray-50" };
              const Icon = config.icon;
              const detail = getDetailText(log.action, log.details);
              const hasDiff = log.details?.diff && Object.keys(log.details.diff).length > 0;
              const isExpanded = expandedLog === log.id;
              const hasDetails = log.details && Object.keys(log.details).length > 0;
              return (
                <div key={log.id}>
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gradient-to-r hover:from-blue-500/5 hover:to-purple-500/5 transition-all cursor-pointer"
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  >
                    <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-sm font-semibold text-foreground">{config.label}</span>
                        {detail && <span className="text-xs text-gray-500 truncate max-w-[300px]">{detail}</span>}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        <span className="font-medium text-gray-500 mr-2">{adminNames[log.adminUid] || log.adminUid?.substring(0, 8) || "System"}</span>
                        {formatTimestamp(log.timestamp)}
                        {timeAgo(log.timestamp) && <span className="ml-2 text-gray-300">({timeAgo(log.timestamp)})</span>}
                      </p>
                    </div>
                    {log.targetId && <span className="hidden sm:inline text-[10px] font-mono text-gray-300 bg-gray-50 px-2 py-1 rounded-lg flex-shrink-0">{log.targetId.substring(0, 12)}...</span>}
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                  </motion.div>

                  {/* ── Expandable Detail Panel ── */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="mx-5 mb-4 p-4 bg-gradient-to-br from-gray-50/80 to-blue-50/30 rounded-xl border border-border-color space-y-3">
                          {/* Row 1: Admin + Timestamp */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {(adminNames[log.adminUid] || "?")[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-foreground">{adminNames[log.adminUid] || "System"}</p>
                                <p className="text-[10px] text-gray-400 font-mono">{log.adminUid || "—"}</p>
                              </div>
                            </div>
                            <div className="text-right sm:text-right">
                              <p className="text-xs text-foreground font-medium">{formatTimestamp(log.timestamp)}</p>
                              {timeAgo(log.timestamp) && <p className="text-[10px] text-gray-400">{timeAgo(log.timestamp)}</p>}
                            </div>
                          </div>

                          {/* Row 2: Target ID */}
                          {log.targetId && (
                            <div className="flex items-center gap-2 p-2 bg-white/60 rounded-lg border border-border-color">
                              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Target ID</span>
                              <code className="text-[11px] font-mono text-gray-600 flex-1 break-all">{log.targetId}</code>
                              <button
                                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(log.targetId); setCopiedId(log.id); setTimeout(() => setCopiedId(null), 2000); }}
                                className="p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0"
                                title="Copy ID"
                              >
                                {copiedId === log.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                              </button>
                            </div>
                          )}

                          {/* Row 3: Diff viewer (for UPDATE_WORD) */}
                          {hasDiff && (
                            <div className="space-y-1.5">
                              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Thay đổi chi tiết</p>
                              {Object.entries(log.details.diff).map(([field, val]) => (
                                <div key={field} className="flex items-start gap-2 text-xs py-1.5 px-2 bg-white/60 rounded-lg border border-border-color">
                                  <span className="font-semibold text-gray-600 min-w-[100px] flex-shrink-0">{field}</span>
                                  <span className="text-red-500 line-through break-all">{String(val?.before ?? "—")}</span>
                                  <span className="text-gray-400 flex-shrink-0">→</span>
                                  <span className="text-emerald-600 font-medium break-all">{String(val?.after ?? "—")}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Row 4: All details (generic key-value, skip diff which is shown above) */}
                          {hasDetails && (
                            <div className="space-y-1">
                              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Thông tin chi tiết</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {Object.entries(log.details).filter(([k]) => k !== "diff").map(([key, value]) => (
                                  <div key={key} className="flex items-start gap-2 text-xs py-1.5 px-2 bg-white/60 rounded-lg border border-border-color">
                                    <span className="font-semibold text-gray-500 min-w-[90px] flex-shrink-0">{key}</span>
                                    <span className="text-gray-700 break-all">
                                      {Array.isArray(value) ? value.join(", ") : typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? "—")}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Empty state */}
                          {!hasDetails && !log.targetId && (
                            <p className="text-xs text-gray-400 italic text-center py-2">Không có thông tin chi tiết bổ sung.</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
        {!loading && filteredLogs.length >= maxCount && (
          <div className="px-5 py-3 border-t border-border-color text-center">
            <button onClick={() => setMaxCount((c) => c + 50)} className="text-sm font-medium text-primary-500 hover:text-primary-600 cursor-pointer">Tải thêm 50 bản ghi →</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
