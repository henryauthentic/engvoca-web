"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, FolderTree } from "lucide-react";

const ICON_OPTIONS = [
  "📚", "🏠", "✈️", "💼", "🎓", "🍔", "💊", "🎭",
  "🌍", "💻", "🎵", "⚽", "🛒", "📰", "🔬", "🎨",
];

const COLOR_OPTIONS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#a855f7",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

export default function TopicFormModal({
  open,
  onClose,
  onSubmit,
  initialData = null,
  parentTopics = [],
  loading = false,
  initialParentId = null,
}) {
  const isEdit = !!initialData;
  const [isChild, setIsChild] = useState(!!initialParentId || !!initialData?.parent_id);

  const [form, setForm] = useState({
    name: "",
    description: "",
    icon_url: "📚",
    color_hex: "#3b82f6",
    parent_id: null,
    order_index: 0,
    image_url: "",
    status: "published",
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || "",
        description: initialData.description || "",
        icon_url: initialData.icon_url || "📚",
        color_hex: initialData.color_hex || "#3b82f6",
        parent_id: initialData.parent_id || null,
        order_index: initialData.order_index || 0,
        image_url: initialData.image_url || "",
        status: initialData.status || "published",
      });
      setIsChild(!!initialData.parent_id);
    } else {
      setForm({
        name: "", description: "", icon_url: "📚",
        color_hex: "#3b82f6", parent_id: initialParentId || null, order_index: 0, image_url: "",
        status: "published",
      });
      setIsChild(!!initialParentId);
    }
  }, [initialData, initialParentId, open]);

  const [errors, setErrors] = useState({});

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = "Bắt buộc";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    if (!isChild) {
      form.parent_id = null;
    }
    onSubmit({
      ...form,
      parent_id: form.parent_id || null,
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl z-50 p-4"
          >
            <div className="bg-surface-elevated rounded-2xl shadow-xl border border-border-color overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-color bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <FolderTree className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">
                    {isEdit ? "Chỉnh sửa chủ đề" : "Tạo chủ đề mới"}
                  </h3>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-200 flex items-center justify-center cursor-pointer">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* CỘT TRÁI (THÔNG TIN CHÍNH) */}
                  <div className="space-y-5">
                    {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Tên chủ đề <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => { setForm(f => ({ ...f, name: e.target.value })); setErrors({}); }}
                    placeholder="e.g. Daily Life"
                    className={`w-full px-4 py-2.5 bg-surface border rounded-xl text-sm outline-none transition-colors ${
                      errors.name ? "border-red-400" : "border-border-color focus:border-primary-400"
                    }`}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mô tả</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Mô tả ngắn..."
                    rows={2}
                    className="w-full px-4 py-2.5 bg-surface border border-border-color rounded-xl text-sm outline-none focus:border-primary-400 resize-none"
                  />
                </div>

                {/* Topic Type (Parent vs Child) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Loại chủ đề</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="topic_type" 
                        checked={!isChild} 
                        onChange={() => {
                          setIsChild(false);
                          setForm(f => ({ ...f, parent_id: null }));
                        }} 
                        className="w-4 h-4 text-primary-500 cursor-pointer"
                      />
                      <span className="text-sm text-foreground">Chủ đề gốc</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="topic_type" 
                        checked={isChild} 
                        onChange={() => {
                          setIsChild(true);
                          if (parentTopics.length > 0) {
                            setForm(f => ({ ...f, parent_id: parentTopics[0].id }));
                          }
                        }} 
                        className="w-4 h-4 text-primary-500 cursor-pointer"
                      />
                      <span className="text-sm text-foreground">Chủ đề con</span>
                    </label>
                  </div>
                </div>

                {/* Parent Topic Selection (only if isChild) */}
                {isChild && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Chọn Chủ đề gốc</label>
                  <select
                    value={form.parent_id || ""}
                    onChange={(e) => setForm(f => ({ ...f, parent_id: e.target.value || null }))}
                    className="w-full px-4 py-2.5 bg-surface border border-border-color rounded-xl text-sm outline-none cursor-pointer"
                  >
                    <option value="">— Không (chủ đề gốc) —</option>
                    {parentTopics
                      .filter(t => !isEdit || t.id !== initialData?.id)
                      .map(t => (
                        <option key={t.id} value={t.id}>{t.icon_url} {t.name}</option>
                      ))}
                  </select>
                </motion.div>
                )}

                {/* Order Index */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Thứ tự hiển thị (Order Index)
                  </label>
                  <input
                    type="number"
                    value={form.order_index}
                    onChange={(e) => setForm(f => ({ ...f, order_index: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 bg-surface border border-border-color rounded-xl text-sm outline-none focus:border-primary-400 transition-colors"
                  />
                </div>
              </div>

              {/* CỘT PHẢI (TRỰC QUAN & TRẠNG THÁI) */}
              <div className="space-y-5">
                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Trạng thái</label>
                  <div className="flex gap-2">
                    {[
                      { value: "draft", label: "Draft", cls: form.status === "draft" ? "bg-gray-500 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200" },
                      { value: "published", label: "Published", cls: form.status === "published" ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" },
                      { value: "archived", label: "Archived", cls: form.status === "archived" ? "bg-orange-500 text-white shadow-md shadow-orange-500/25" : "bg-orange-50 text-orange-600 hover:bg-orange-100" },
                    ].map(({ value, label, cls }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, status: value }))}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${cls}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icon picker */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Icon</label>
                  <div className="flex flex-wrap gap-2">
                    {ICON_OPTIONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, icon_url: icon }))}
                        className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                          form.icon_url === icon
                            ? "bg-primary-500 shadow-md shadow-primary-500/30 scale-110"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color picker */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Màu sắc</label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, color_hex: color }))}
                        className={`w-8 h-8 rounded-full transition-all cursor-pointer ${
                          form.color_hex === color ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""
                        }`}
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                </div>

                  </div>
                </div>

                {/* Preview */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{ background: form.color_hex + "20", color: form.color_hex }}>
                    {form.icon_url}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{form.name || "Tên chủ đề"}</p>
                    <p className="text-[11px] text-gray-400">{form.description || "Mô tả"}</p>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex items-center justify-end gap-3 pt-6 mt-4 border-t border-border-color">
                  <button type="button" onClick={onClose} disabled={loading}
                    className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 cursor-pointer">
                    Huỷ
                  </button>
                  <button type="submit" disabled={loading}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isEdit ? "Cập nhật" : "Tạo chủ đề"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
