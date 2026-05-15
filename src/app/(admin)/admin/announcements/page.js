"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { hasPermission } from "@/lib/permissions";
import {
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
} from "@/lib/adminService";
import AnnouncementFormModal from "@/components/admin/AnnouncementFormModal";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { motion } from "framer-motion";
import {
  Megaphone, Plus, Pencil, Trash2, Loader2, ShieldAlert,
} from "lucide-react";

const TYPE_BADGE = {
  info: "bg-blue-50 text-blue-600 border-blue-200",
  warning: "bg-amber-50 text-amber-600 border-amber-200",
  success: "bg-emerald-50 text-emerald-600 border-emerald-200",
  promotion: "bg-purple-50 text-purple-600 border-purple-200",
};

const TYPE_LABEL = { info: "Info", warning: "Warning", success: "Success", promotion: "Promo" };

const TEMPLATE_LABEL = {
  info: "ℹ️", warning: "⚠️", success: "✅", reward: "🎁", streak: "🔥",
  update: "🔄", event: "🎉", promotion: "💎", achievement: "🏆",
};

const DISPLAY_MODE_LABEL = {
  banner: "📋 Banner", popup: "📱 Popup", bottom_sheet: "⬆️ Sheet",
};

function getStatus(ann) {
  if (!ann.isActive) return { label: "Đã tắt", cls: "bg-gray-100 text-gray-500 border-gray-200" };
  const today = new Date().toISOString().split("T")[0];
  if (ann.startDate && ann.startDate > today) return { label: "Chờ hiện", cls: "bg-amber-50 text-amber-600 border-amber-200" };
  if (ann.endDate && ann.endDate < today) return { label: "Hết hạn", cls: "bg-red-50 text-red-500 border-red-200" };
  return { label: "Đang hiện", cls: "bg-emerald-50 text-emerald-600 border-emerald-200" };
}

export default function AnnouncementsPage() {
  const { user, userRole } = useAuth();
  const canManage = hasPermission(userRole, "announcements.manage");
  const canView = hasPermission(userRole, "announcements.view");

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { loadAnnouncements(); }, []);

  async function loadAnnouncements() {
    setLoading(true);
    try {
      const data = await getAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error("Failed to load announcements:", err);
    }
    setLoading(false);
  }

  async function handleSubmit(formData) {
    setFormLoading(true);
    try {
      if (editing) {
        await updateAnnouncement(user.uid, editing.id, formData);
      } else {
        await createAnnouncement(user.uid, formData);
      }
      setFormOpen(false);
      setEditing(null);
      await loadAnnouncements();
    } catch (err) {
      console.error("Failed to save announcement:", err);
      alert("Lỗi: " + err.message);
    }
    setFormLoading(false);
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    try {
      await deleteAnnouncement(user.uid, deleteConfirm);
      setDeleteConfirm(null);
      await loadAnnouncements();
    } catch (err) {
      console.error("Failed to delete announcement:", err);
      alert("Lỗi: " + err.message);
    }
  }

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

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Thông báo & Banner</h1>
          <p className="text-sm text-gray-500 mt-1">{announcements.length} thông báo</p>
        </div>
        {canManage && (
          <button
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tạo mới
          </button>
        )}
      </motion.div>

      {/* List */}
      {announcements.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <Megaphone className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Chưa có thông báo nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann, i) => {
            const status = getStatus(ann);
            const typeBadge = TYPE_BADGE[ann.type] || TYPE_BADGE.info;

            return (
              <motion.div
                key={ann.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-panel hover-lift p-5"
              >
                <div className="flex items-start gap-4">
                  {/* Left indicator */}
                  <div className={`w-1.5 h-full min-h-[60px] rounded-full flex-shrink-0 ${ann.type === "warning" ? "bg-amber-400" : ann.type === "success" ? "bg-emerald-400" : ann.type === "promotion" ? "bg-purple-400" : "bg-blue-400"}`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-bold text-foreground">{ann.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeBadge}`}>
                        {TEMPLATE_LABEL[ann.template] || TEMPLATE_LABEL[ann.type] || ""} {TYPE_LABEL[ann.type] || ann.template || ann.type}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.cls}`}>
                        {status.label}
                      </span>
                      {ann.displayMode && ann.displayMode !== "banner" && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200">
                          {DISPLAY_MODE_LABEL[ann.displayMode] || ann.displayMode}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{ann.message}</p>
                    <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-400">
                      {ann.startDate && <span>📅 {ann.startDate} → {ann.endDate || "∞"}</span>}
                      {ann.ctaText && <span>🔘 {ann.ctaText}</span>}
                      {ann.deepLink && <span>🔗 {ann.deepLink}</span>}
                      <span>Priority: {ann.priority}</span>
                      {ann.showOnlyOnce && <span>1️⃣</span>}
                      {ann.bgGradient && <div className="w-12 h-3 rounded-full" style={{ background: `linear-gradient(90deg, ${ann.bgGradient[0]}, ${ann.bgGradient[1]})` }} />}
                    </div>
                  </div>

                  {/* Actions */}
                  {canManage && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditing(ann); setFormOpen(true); }}
                        className="w-8 h-8 rounded-lg hover:bg-blue-50 flex items-center justify-center cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5 text-gray-400 hover:text-blue-500" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(ann.id)}
                        className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      <AnnouncementFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
        initialData={editing}
        loading={formLoading}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Xoá thông báo"
        message="Bạn có chắc muốn xoá thông báo này? Hành động này không thể hoàn tác."
        confirmText="Xoá"
        destructive
      />
    </div>
  );
}
