"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Loader2, MessageSquare, Bug, Lightbulb, AlertTriangle, HelpCircle,
  CheckCircle2, Clock, XCircle, Smartphone, Monitor, Globe,
  Flame, ArrowUp, ArrowUpRight, AlertCircle,
} from "lucide-react";

const TYPE_CONFIG = {
  bug: { icon: Bug, label: "Bug", color: "text-red-500", bg: "bg-red-50" },
  suggestion: { icon: Lightbulb, label: "Góp ý", color: "text-amber-500", bg: "bg-amber-50" },
  wrong_word: { icon: AlertTriangle, label: "Từ sai", color: "text-orange-500", bg: "bg-orange-50" },
  question: { icon: HelpCircle, label: "Câu hỏi", color: "text-blue-500", bg: "bg-blue-50" },
};

const STATUS_CONFIG = {
  new: { icon: Clock, label: "Mới", cls: "bg-blue-50 text-blue-600 border-blue-200" },
  in_progress: { icon: Loader2, label: "Đang xử lý", cls: "bg-amber-50 text-amber-600 border-amber-200" },
  resolved: { icon: CheckCircle2, label: "Đã giải quyết", cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  dismissed: { icon: XCircle, label: "Bỏ qua", cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

const PRIORITY_OPTIONS = [
  { key: "low", label: "Thấp", icon: AlertCircle, cls: "bg-gray-100 text-gray-500 border-gray-200" },
  { key: "medium", label: "Trung bình", icon: ArrowUpRight, cls: "bg-amber-50 text-amber-600 border-amber-200" },
  { key: "high", label: "Cao", icon: ArrowUp, cls: "bg-orange-100 text-orange-700 border-orange-200" },
  { key: "critical", label: "Critical", icon: Flame, cls: "bg-red-500 text-white border-red-500" },
];

function getSlaDisplay(createdAt) {
  if (!createdAt) return null;
  const created = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
  const now = new Date();
  const diffMs = now - created;
  const diffH = diffMs / (1000 * 60 * 60);
  const diffD = diffH / 24;

  if (diffH < 1) return { label: `${Math.floor(diffH * 60)} phút`, cls: "text-emerald-600", emoji: "🟢" };
  if (diffH < 3) return { label: `${Math.floor(diffH)} giờ`, cls: "text-emerald-600", emoji: "🟢" };
  if (diffH < 24) return { label: `${Math.floor(diffH)} giờ`, cls: "text-amber-600", emoji: "🟡" };
  if (diffD < 2) return { label: `${Math.floor(diffD)} ngày ${Math.floor(diffH % 24)}h`, cls: "text-orange-600", emoji: "🟠" };
  return { label: `${Math.floor(diffD)} ngày`, cls: "text-red-600 font-bold", emoji: "🔴" };
}

export default function FeedbackDetailDrawer({
  open, onClose, ticket, onSave, loading = false,
}) {
  const [status, setStatus] = useState(ticket?.status || "new");
  const [adminNote, setAdminNote] = useState(ticket?.adminNote || "");
  const [priority, setPriority] = useState(ticket?.priority || "low");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ticket) {
      setStatus(ticket.status || "new");
      setAdminNote(ticket.adminNote || "");
      setPriority(ticket.priority || "low");
    }
  }, [ticket]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(ticket.id, { status, adminNote, priority });
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  }

  const typeInfo = TYPE_CONFIG[ticket?.type] || TYPE_CONFIG.question;
  const TypeIcon = typeInfo.icon;
  const sla = ticket && (ticket.status === "new" || ticket.status === "in_progress")
    ? getSlaDisplay(ticket.createdAt) : null;

  // Device info fields
  const hasDeviceInfo = ticket?.platform || ticket?.appVersion || ticket?.deviceModel || ticket?.osVersion;

  return (
    <AnimatePresence>
      {open && ticket && (
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
            className="fixed top-0 right-0 h-full w-full max-w-[420px] bg-surface-elevated border-l border-border-color z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-color">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${typeInfo.bg} flex items-center justify-center`}>
                  <TypeIcon className={`w-4 h-4 ${typeInfo.color}`} />
                </div>
                <h3 className="text-sm font-bold text-foreground">Chi tiết phản hồi</h3>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center cursor-pointer">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Sender Info */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(ticket.userName || "U").substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{ticket.userName || "Unknown"}</p>
                  <p className="text-xs text-gray-400">{ticket.userEmail || "—"}</p>
                </div>
                {sla && (
                  <div className={`text-right`}>
                    <p className={`text-xs font-semibold ${sla.cls}`}>{sla.emoji} {sla.label}</p>
                    <p className="text-[10px] text-gray-400">thời gian chờ</p>
                  </div>
                )}
              </div>

              {/* Type & Subject */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${typeInfo.bg} ${typeInfo.color}`}>
                    {typeInfo.label}
                  </span>
                  <span className="text-[10px] text-gray-300">
                    {ticket.createdAt ? new Date(ticket.createdAt.toDate ? ticket.createdAt.toDate() : ticket.createdAt).toLocaleString("vi-VN") : "—"}
                  </span>
                </div>
                <h4 className="text-base font-bold text-foreground">{ticket.subject || "(Không có tiêu đề)"}</h4>
              </div>

              {/* Message */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.message}</p>
              </div>

              {/* Wrong Word Info */}
              {ticket.type === "wrong_word" && ticket.wordText && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
                  <p className="text-xs font-bold text-orange-600 mb-1">📝 Từ vựng bị báo sai</p>
                  <p className="text-sm font-bold text-foreground">{ticket.wordText}</p>
                  {ticket.wordId && (
                    <p className="text-[10px] text-gray-400 mt-0.5 font-mono">ID: {ticket.wordId}</p>
                  )}
                </div>
              )}

              {/* Device Info */}
              {hasDeviceInfo && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" />
                    Thông tin thiết bị
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {ticket.platform && (
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-600">{ticket.platform}</span>
                      </div>
                    )}
                    {ticket.osVersion && (
                      <div className="flex items-center gap-1.5">
                        <Monitor className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-600">{ticket.osVersion}</span>
                      </div>
                    )}
                    {ticket.appVersion && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400">App:</span>
                        <span className="text-xs text-gray-600 font-mono">v{ticket.appVersion}</span>
                      </div>
                    )}
                    {ticket.deviceModel && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400">Model:</span>
                        <span className="text-xs text-gray-600">{ticket.deviceModel}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mức ưu tiên</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {PRIORITY_OPTIONS.map(({ key, label, icon: PIcon, cls }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPriority(key)}
                      className={`py-2 rounded-xl text-[11px] font-semibold transition-all cursor-pointer border flex items-center justify-center gap-1 ${priority === key ? cls + " shadow-sm" : "bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100"}`}
                    >
                      <PIcon className="w-3 h-3" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Trạng thái</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(STATUS_CONFIG).map(([key, { label, cls }]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStatus(key)}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${status === key ? cls + " shadow-sm" : "bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin Note */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ghi chú xử lý (Admin)</label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Ghi chú nội bộ..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-surface border border-border-color rounded-xl text-sm outline-none focus:border-primary-400 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border-color flex items-center gap-3">
              <button onClick={onClose}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 cursor-pointer">
                Đóng
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Lưu thay đổi
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
