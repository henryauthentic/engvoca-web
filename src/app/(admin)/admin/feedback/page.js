"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { hasPermission } from "@/lib/permissions";
import { getFeedbackTickets, updateFeedbackTicket, getNewFeedbackCount, softDeleteFeedback } from "@/lib/adminService";
import FeedbackDetailDrawer from "@/components/admin/FeedbackDetailDrawer";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { motion } from "framer-motion";
import {
  MessageSquare, Bug, Lightbulb, AlertTriangle, HelpCircle,
  Loader2, ShieldAlert, Inbox, Search, Clock, Trash2,
  AlertCircle, ArrowUp, ArrowUpRight, Flame,
} from "lucide-react";

const TYPE_TABS = [
  { key: "", label: "Tất cả", icon: Inbox },
  { key: "bug", label: "Bug", icon: Bug },
  { key: "suggestion", label: "Góp ý", icon: Lightbulb },
  { key: "wrong_word", label: "Từ sai", icon: AlertTriangle },
  { key: "question", label: "Câu hỏi", icon: HelpCircle },
];

const STATUS_FILTERS = [
  { key: "", label: "Mọi trạng thái" },
  { key: "new", label: "Mới" },
  { key: "in_progress", label: "Đang xử lý" },
  { key: "resolved", label: "Đã giải quyết" },
  { key: "dismissed", label: "Bỏ qua" },
];

const STATUS_BADGE = {
  new: "bg-blue-50 text-blue-600 border-blue-200",
  in_progress: "bg-amber-50 text-amber-600 border-amber-200",
  resolved: "bg-emerald-50 text-emerald-600 border-emerald-200",
  dismissed: "bg-gray-100 text-gray-500 border-gray-200",
};

const STATUS_LABEL = {
  new: "Mới",
  in_progress: "Đang xử lý",
  resolved: "Đã giải quyết",
  dismissed: "Bỏ qua",
};

const TYPE_ICON = {
  bug: Bug,
  suggestion: Lightbulb,
  wrong_word: AlertTriangle,
  question: HelpCircle,
};

const TYPE_COLOR = {
  bug: "text-red-500 bg-red-50",
  suggestion: "text-amber-500 bg-amber-50",
  wrong_word: "text-orange-500 bg-orange-50",
  question: "text-blue-500 bg-blue-50",
};

const PRIORITY_CONFIG = {
  critical: { label: "Critical", icon: Flame, cls: "bg-red-500 text-white" },
  high: { label: "Cao", icon: ArrowUp, cls: "bg-orange-100 text-orange-700 border-orange-200" },
  medium: { label: "TB", icon: ArrowUpRight, cls: "bg-amber-50 text-amber-600 border-amber-200" },
  low: { label: "Thấp", icon: AlertCircle, cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

function getSlaInfo(createdAt) {
  if (!createdAt) return null;
  const created = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
  const now = new Date();
  const diffMs = now - created;
  const diffH = diffMs / (1000 * 60 * 60);
  const diffD = diffH / 24;

  if (diffH < 3) return { label: `${Math.floor(diffH * 60)}p`, cls: "text-emerald-600 bg-emerald-50", level: 0 };
  if (diffH < 24) return { label: `${Math.floor(diffH)}h`, cls: "text-amber-600 bg-amber-50", level: 1 };
  if (diffD < 2) return { label: `${Math.floor(diffH)}h`, cls: "text-orange-600 bg-orange-50", level: 2 };
  return { label: `${Math.floor(diffD)}d`, cls: "text-red-600 bg-red-50 font-bold", level: 3 };
}

export default function FeedbackPage() {
  const { user, userRole } = useAuth();
  const canView = hasPermission(userRole, "feedback.view");
  const canManage = hasPermission(userRole, "feedback.manage");

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newCount, setNewCount] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { loadTickets(); }, [typeFilter, statusFilter]);

  async function loadTickets() {
    setLoading(true);
    try {
      const [data, count] = await Promise.all([
        getFeedbackTickets({ type: typeFilter || undefined, status: statusFilter || undefined }),
        getNewFeedbackCount(),
      ]);
      // Filter out soft-deleted tickets
      setTickets(data.filter(t => !t.deleted));
      setNewCount(count);
    } catch (err) {
      console.error("Failed to load feedback:", err);
    }
    setLoading(false);
  }

  async function handleSave(ticketId, updates) {
    try {
      await updateFeedbackTicket(user.uid, ticketId, updates);
      setSelectedTicket(null);
      await loadTickets();
    } catch (err) {
      console.error("Failed to update ticket:", err);
      alert("Lỗi: " + err.message);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    try {
      await softDeleteFeedback(user.uid, deleteConfirm);
      setDeleteConfirm(null);
      await loadTickets();
    } catch (err) {
      console.error("Failed to delete ticket:", err);
      alert("Lỗi: " + err.message);
    }
  }

  // Client-side search filter
  const filteredTickets = searchQuery.trim()
    ? tickets.filter(t => {
        const q = searchQuery.toLowerCase();
        return (t.subject || "").toLowerCase().includes(q)
          || (t.message || "").toLowerCase().includes(q)
          || (t.userName || "").toLowerCase().includes(q);
      })
    : tickets;

  if (!canView) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Bạn không có quyền truy cập trang này</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Feedback & Support</h1>
          {newCount > 0 && (
            <span className="px-2.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
              {newCount} mới
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">Tiếp nhận và xử lý phản hồi người dùng</p>
      </motion.div>

      {/* Filters + Search */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Type Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {TYPE_TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTypeFilter(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  typeFilter === key
                    ? "bg-white text-foreground shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-surface border border-border-color rounded-xl text-xs font-semibold outline-none cursor-pointer"
          >
            {STATUS_FILTERS.map(({ key, label }) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tiêu đề, nội dung, tên người gửi..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border-color rounded-xl text-sm outline-none focus:border-primary-400 transition-colors"
          />
        </div>
      </motion.div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            {searchQuery ? "Không tìm thấy kết quả" : "Chưa có phản hồi nào"}
          </p>
          <p className="text-xs text-gray-300 mt-1">
            {searchQuery ? "Thử từ khoá khác" : "Khi người dùng gửi feedback từ app, chúng sẽ hiện ở đây"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTickets.map((ticket, i) => {
            const Icon = TYPE_ICON[ticket.type] || HelpCircle;
            const typeColor = TYPE_COLOR[ticket.type] || TYPE_COLOR.question;
            const statusCls = STATUS_BADGE[ticket.status] || STATUS_BADGE.new;
            const sla = ticket.status === "new" || ticket.status === "in_progress"
              ? getSlaInfo(ticket.createdAt) : null;
            const prio = PRIORITY_CONFIG[ticket.priority];

            return (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="glass-panel hover-lift p-4 flex items-center gap-4 group"
              >
                {/* Type Icon */}
                <div
                  onClick={() => canManage && setSelectedTicket(ticket)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColor} ${canManage ? "cursor-pointer" : ""}`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content */}
                <div
                  className={`flex-1 min-w-0 ${canManage ? "cursor-pointer" : ""}`}
                  onClick={() => canManage && setSelectedTicket(ticket)}
                >
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-sm font-semibold text-foreground truncate">{ticket.subject || "(Không có tiêu đề)"}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 ${statusCls}`}>
                      {STATUS_LABEL[ticket.status] || ticket.status}
                    </span>
                    {prio && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 ${prio.cls}`}>
                        <prio.icon className="w-2.5 h-2.5" />
                        {prio.label}
                      </span>
                    )}
                    {sla && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 ${sla.cls}`}>
                        <Clock className="w-2.5 h-2.5" />
                        {sla.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{ticket.message}</p>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-medium text-gray-500">{ticket.userName || "Unknown"}</p>
                    <p className="text-[10px] text-gray-300">
                      {ticket.createdAt
                        ? new Date(ticket.createdAt.toDate ? ticket.createdAt.toDate() : ticket.createdAt).toLocaleDateString("vi-VN")
                        : "—"}
                    </p>
                  </div>
                  {canManage && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(ticket.id); }}
                      className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Xoá ticket"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-gray-300 hover:text-red-500" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail Drawer */}
      <FeedbackDetailDrawer
        open={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        ticket={selectedTicket}
        onSave={handleSave}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Xoá phản hồi"
        message="Ticket sẽ bị ẩn khỏi danh sách (soft delete). Dữ liệu vẫn được lưu trong Firestore."
        confirmText="Xoá"
        destructive
      />
    </div>
  );
}
