"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { hasPermission } from "@/lib/permissions";
import {
  getFeatureFlags, toggleFeatureFlag, createFeatureFlag, deleteFeatureFlag,
} from "@/lib/adminService";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { motion } from "framer-motion";
import {
  ToggleLeft, ToggleRight, Plus, Trash2, Loader2, ShieldAlert, Zap, X,
} from "lucide-react";

export default function FeatureFlagsPage() {
  const { user, userRole } = useAuth();
  const canToggle = hasPermission(userRole, "flags.toggle") || userRole === "superadmin";
  const canView = hasPermission(userRole, "flags.view") || userRole === "superadmin";

  const [flagsData, setFlagsData] = useState({ flags: {} });
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFlag, setNewFlag] = useState({ key: "", label: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { loadFlags(); }, []);

  async function loadFlags() {
    setLoading(true);
    try {
      const data = await getFeatureFlags();
      setFlagsData(data);
    } catch (err) {
      console.error("Failed to load feature flags:", err);
    }
    setLoading(false);
  }

  async function handleToggle(key, currentEnabled) {
    if (!canToggle) return;
    setToggling(key);
    try {
      await toggleFeatureFlag(user.uid, key, !currentEnabled);
      await loadFlags();
    } catch (err) {
      console.error("Failed to toggle flag:", err);
      alert("Lỗi: " + err.message);
    }
    setToggling(null);
  }

  async function handleCreate() {
    if (!newFlag.key.trim() || !newFlag.label.trim()) return;
    setCreating(true);
    try {
      const safeKey = newFlag.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
      await createFeatureFlag(user.uid, safeKey, newFlag.label.trim(), newFlag.description.trim());
      setNewFlag({ key: "", label: "", description: "" });
      setShowAddForm(false);
      await loadFlags();
    } catch (err) {
      console.error("Failed to create flag:", err);
      alert("Lỗi: " + err.message);
    }
    setCreating(false);
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    try {
      await deleteFeatureFlag(user.uid, deleteConfirm);
      setDeleteConfirm(null);
      await loadFlags();
    } catch (err) {
      console.error("Failed to delete flag:", err);
      alert("Lỗi: " + err.message);
    }
  }

  if (!canView) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Bạn không có quyền truy cập trang này</p>
        </div>
      </div>
    );
  }

  const flags = flagsData.flags || {};
  const flagKeys = Object.keys(flags);
  const enabledCount = flagKeys.filter((k) => flags[k]?.enabled).length;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Feature Flags</h1>
          <p className="text-sm text-gray-500 mt-1">
            {enabledCount}/{flagKeys.length} flags đang bật
          </p>
        </div>
        {canToggle && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all cursor-pointer"
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddForm ? "Đóng" : "Thêm Flag"}
          </button>
        )}
      </motion.div>

      {/* Add Form */}
      {showAddForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6">
          <h3 className="text-sm font-bold text-foreground mb-4">Tạo Feature Flag mới</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Key (ID)</label>
              <input
                type="text"
                value={newFlag.key}
                onChange={(e) => setNewFlag((f) => ({ ...f, key: e.target.value }))}
                placeholder="e.g. dark_mode"
                className="w-full px-3 py-2 bg-surface border border-border-color rounded-xl text-sm outline-none focus:border-primary-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Tên hiển thị</label>
              <input
                type="text"
                value={newFlag.label}
                onChange={(e) => setNewFlag((f) => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Dark Mode"
                className="w-full px-3 py-2 bg-surface border border-border-color rounded-xl text-sm outline-none focus:border-primary-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Mô tả</label>
              <input
                type="text"
                value={newFlag.description}
                onChange={(e) => setNewFlag((f) => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Bật chế độ tối"
                className="w-full px-3 py-2 bg-surface border border-border-color rounded-xl text-sm outline-none focus:border-primary-400"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !newFlag.key.trim() || !newFlag.label.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
          >
            {creating && <Loader2 className="w-4 h-4 animate-spin" />}
            Tạo Flag
          </button>
        </motion.div>
      )}

      {/* Flags List */}
      {flagKeys.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <Zap className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Chưa có feature flag nào</p>
          <p className="text-xs text-gray-300 mt-1">Bấm "Thêm Flag" để tạo flag đầu tiên</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flagKeys.map((key, i) => {
            const flag = flags[key];
            const isEnabled = flag?.enabled;
            const isToggling = toggling === key;

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-panel hover-lift p-5 flex items-center gap-4"
              >
                {/* Toggle */}
                <button
                  onClick={() => handleToggle(key, isEnabled)}
                  disabled={!canToggle || isToggling}
                  className="flex-shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isToggling ? (
                    <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                  ) : isEnabled ? (
                    <ToggleRight className="w-10 h-10 text-emerald-500 transition-colors" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-gray-300 transition-colors" />
                  )}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">{flag?.label || key}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isEnabled
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        : "bg-gray-50 text-gray-400 border border-gray-200"
                    }`}>
                      {isEnabled ? "ON" : "OFF"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{flag?.description || "—"}</p>
                  <p className="text-[10px] text-gray-300 mt-1 font-mono">key: {key}</p>
                </div>

                {/* Delete */}
                {canToggle && (
                  <button
                    onClick={() => setDeleteConfirm(key)}
                    className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center cursor-pointer transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-gray-300 hover:text-red-500" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Xoá Feature Flag"
        message={`Bạn có chắc muốn xoá flag "${deleteConfirm}"? Hành động này không thể hoàn tác.`}
        confirmText="Xoá"
        destructive
      />
    </div>
  );
}
