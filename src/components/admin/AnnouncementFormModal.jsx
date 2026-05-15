"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Megaphone, Link as LinkIcon, Eye, Smartphone, Maximize2, Monitor, Tablet } from "lucide-react";

const TEMPLATE_OPTIONS = [
  { value: "info", label: "ℹ️ Info", gradient: ["#3b82f6", "#6366f1"] },
  { value: "warning", label: "⚠️ Warning", gradient: ["#f59e0b", "#ef4444"] },
  { value: "success", label: "✅ Success", gradient: ["#10b981", "#34d399"] },
  { value: "reward", label: "🎁 Reward", gradient: ["#f6d365", "#fda085"] },
  { value: "streak", label: "🔥 Streak", gradient: ["#f83600", "#f9d423"] },
  { value: "update", label: "🔄 Update", gradient: ["#11998e", "#38ef7d"] },
  { value: "event", label: "🎉 Event", gradient: ["#6a11cb", "#2575fc"] },
  { value: "promotion", label: "💎 Promo", gradient: ["#ec4899", "#8b5cf6"] },
  { value: "achievement", label: "🏆 Achievement", gradient: ["#667eea", "#764ba2"] },
];

const DISPLAY_MODES = [
  { value: "banner", label: "📋 Banner", desc: "Inline trên Home" },
  { value: "popup", label: "📱 Popup", desc: "Toàn màn hình" },
  { value: "bottom_sheet", label: "⬆️ Bottom Sheet", desc: "Nổi từ dưới" },
];

const CTA_STYLES = [
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "ghost", label: "Ghost" },
];

const PLATFORMS = [
  { value: "all", label: "Tất cả" },
  { value: "android", label: "Android" },
  { value: "ios", label: "iOS" },
];

const IMAGE_SIZES = [
  { value: "small", label: "S", px: "64px" },
  { value: "medium", label: "M", px: "120px" },
  { value: "large", label: "L", px: "100%" },
];

const DEVICES = [
  { name: "iPhone SE", w: 220, h: 390, r: 24, icon: Smartphone, os: "ios" },
  { name: "iPhone 15 Pro", w: 230, h: 500, r: 30, icon: Smartphone, os: "ios" },
  { name: "Pixel 8", w: 228, h: 490, r: 26, icon: Smartphone, os: "android" },
  { name: "Galaxy S24", w: 232, h: 502, r: 22, icon: Smartphone, os: "android" },
  { name: "iPad Mini", w: 320, h: 430, r: 18, icon: Tablet, os: "ios" },
  { name: "Galaxy Tab", w: 330, h: 440, r: 14, icon: Tablet, os: "android" },
];

const DEFAULT_FORM = {
  title: "", message: "", subtitle: "", badge: "",
  type: "info", template: "info", displayMode: "banner",
  isActive: true, startDate: "", endDate: "",
  deepLink: "", priority: 0, imageSize: "small",
  bgGradient: ["", ""], darkBgGradient: ["", ""],
  illustrationUrl: "", ctaText: "", ctaStyle: "primary",
  isDismissible: true, showOnlyOnce: false, cooldownHours: 0,
  targetMinLevel: 0, targetPlatform: "all", targetScreens: ["home"],
};

export default function AnnouncementFormModal({
  open, onClose, onSubmit, initialData = null, loading = false,
}) {
  const isEdit = !!initialData;
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [errors, setErrors] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(0);

  useEffect(() => {
    if (initialData) {
      setForm({
        ...DEFAULT_FORM,
        ...initialData,
        bgGradient: initialData.bgGradient || ["", ""],
        darkBgGradient: initialData.darkBgGradient || ["", ""],
      });
    } else {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      setForm({
        ...DEFAULT_FORM,
        startDate: today.toISOString().split("T")[0],
        endDate: nextWeek.toISOString().split("T")[0],
      });
    }
    setShowAdvanced(false);
  }, [initialData, open]);

  function validate() {
    const errs = {};
    if (!form.title.trim()) errs.title = "Bắt buộc";
    if (!form.message.trim()) errs.message = "Bắt buộc";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    // Clean empty gradient arrays
    const data = { ...form };
    if (!data.bgGradient[0] && !data.bgGradient[1]) delete data.bgGradient;
    if (!data.darkBgGradient[0] && !data.darkBgGradient[1]) delete data.darkBgGradient;
    if (!data.subtitle) delete data.subtitle;
    if (!data.badge) delete data.badge;
    if (!data.illustrationUrl) delete data.illustrationUrl;
    if (!data.ctaText) delete data.ctaText;
    onSubmit(data);
  }

  const upd = (key, val) => { setForm(f => ({ ...f, [key]: val })); setErrors({}); };
  const selTemplate = TEMPLATE_OPTIONS.find(t => t.value === form.template) || TEMPLATE_OPTIONS[0];
  const previewGradient = (form.bgGradient?.[0] && form.bgGradient?.[1])
    ? form.bgGradient : selTemplate.gradient;

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
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl z-50 p-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-surface-elevated rounded-2xl shadow-xl border border-border-color overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-color bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                    <Megaphone className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">
                    {isEdit ? "Chỉnh sửa thông báo" : "Tạo thông báo mới"}
                  </h3>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-200 flex items-center justify-center cursor-pointer">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Title + Subtitle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Tiêu đề <span className="text-red-400">*</span>
                    </label>
                    <input type="text" value={form.title} onChange={e => upd("title", e.target.value)}
                      placeholder="e.g. Bảo trì hệ thống"
                      className={`w-full px-4 py-2.5 bg-surface border rounded-xl text-sm outline-none ${errors.title ? "border-red-400" : "border-border-color focus:border-primary-400"}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subtitle (tuỳ chọn)</label>
                    <input type="text" value={form.subtitle || ""} onChange={e => upd("subtitle", e.target.value)}
                      placeholder="e.g. 40 từ mới vừa được thêm"
                      className="w-full px-4 py-2.5 bg-surface border border-border-color rounded-xl text-sm outline-none focus:border-primary-400" />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Nội dung <span className="text-red-400">*</span>
                  </label>
                  <textarea value={form.message} onChange={e => upd("message", e.target.value)}
                    placeholder="Nội dung thông báo chi tiết..." rows={3}
                    className={`w-full px-4 py-2.5 bg-surface border rounded-xl text-sm outline-none resize-none ${errors.message ? "border-red-400" : "border-border-color focus:border-primary-400"}`} />
                </div>

                {/* Template + Display Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Template</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {TEMPLATE_OPTIONS.map(({ value, label }) => (
                        <button key={value} type="button" onClick={() => { upd("template", value); upd("type", value === "reward" || value === "streak" || value === "update" || value === "event" || value === "achievement" ? "info" : value); }}
                          className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${form.template === value ? "bg-gray-800 text-white border-gray-800 shadow-sm" : "bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Kiểu hiển thị (Mobile)</label>
                    <div className="space-y-1.5">
                      {DISPLAY_MODES.map(({ value, label, desc }) => (
                        <button key={value} type="button" onClick={() => upd("displayMode", value)}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border flex items-center justify-between ${form.displayMode === value ? "bg-blue-50 text-blue-600 border-blue-200 shadow-sm" : "bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100"}`}>
                          <span>{label}</span>
                          <span className="text-[10px] text-gray-400">{desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Target Screens (Nơi hiển thị) */}
                <div className="bg-gray-50/50 p-4 rounded-xl border border-border-color mt-4">
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Nơi hiển thị</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "home", label: "Trang chủ" },
                      { id: "vocabulary", label: "Từ vựng" },
                      { id: "dictionary", label: "Tra từ" },
                      { id: "progress", label: "Tiến độ" },
                      { id: "settings", label: "Cài đặt" }
                    ].map(tab => {
                      const isChecked = form.targetScreens?.includes(tab.id);
                      return (
                        <label key={tab.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors border ${isChecked ? "bg-primary-50 text-primary-600 border-primary-200" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>
                          <input 
                            type="checkbox" 
                            className="w-3.5 h-3.5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                            checked={isChecked || false} 
                            onChange={(e) => {
                              const current = form.targetScreens || [];
                              if (e.target.checked) upd("targetScreens", [...current, tab.id]);
                              else upd("targetScreens", current.filter(id => id !== tab.id));
                            }} 
                          />
                          {tab.label}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Active + Dismissible */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button type="button" onClick={() => upd("isActive", !form.isActive)}
                    className={`py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${form.isActive ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-gray-50 text-gray-400 border border-gray-200"}`}>
                    {form.isActive ? "✅ Đang bật" : "⚫ Đã tắt"}
                  </button>
                  <button type="button" onClick={() => upd("isDismissible", !form.isDismissible)}
                    className={`py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${form.isDismissible ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-red-50 text-red-500 border border-red-200"}`}>
                    {form.isDismissible ? "❌ Cho đóng" : "🔒 Không cho đóng"}
                  </button>
                  <button type="button" onClick={() => upd("showOnlyOnce", !form.showOnlyOnce)}
                    className={`py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${form.showOnlyOnce ? "bg-purple-50 text-purple-600 border border-purple-200" : "bg-gray-50 text-gray-400 border border-gray-200"}`}>
                    {form.showOnlyOnce ? "1️⃣ Chỉ hiện 1 lần" : "🔄 Hiện nhiều lần"}
                  </button>
                </div>

                {/* Dates + Priority + Cooldown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ngày bắt đầu</label>
                    <input type="date" value={form.startDate} onChange={e => upd("startDate", e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border-color rounded-xl text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ngày kết thúc</label>
                    <input type="date" value={form.endDate} onChange={e => upd("endDate", e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border-color rounded-xl text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ưu tiên</label>
                    <input type="number" value={form.priority} onChange={e => upd("priority", parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-surface border border-border-color rounded-xl text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Cooldown (giờ)</label>
                    <input type="number" value={form.cooldownHours} onChange={e => upd("cooldownHours", parseInt(e.target.value) || 0)}
                      placeholder="0" className="w-full px-3 py-2 bg-surface border border-border-color rounded-xl text-sm outline-none" />
                  </div>
                </div>

                {/* CTA + Deep Link */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">CTA Button Text</label>
                    <input type="text" value={form.ctaText || ""} onChange={e => upd("ctaText", e.target.value)}
                      placeholder="e.g. Học ngay" className="w-full px-4 py-2.5 bg-surface border border-border-color rounded-xl text-sm outline-none focus:border-primary-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">CTA Style</label>
                    <div className="flex gap-1.5">
                      {CTA_STYLES.map(({ value, label }) => (
                        <button key={value} type="button" onClick={() => upd("ctaStyle", value)}
                          className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${form.ctaStyle === value ? "bg-gray-800 text-white border-gray-800" : "bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      <LinkIcon className="w-3 h-3 inline mr-1" />Deep Link
                    </label>
                    <input type="text" list="deep-link-options" value={form.deepLink} onChange={e => upd("deepLink", e.target.value)}
                      placeholder="tab:vocabulary hoặc https://..." className="w-full px-4 py-2.5 bg-surface border border-border-color rounded-xl text-sm outline-none focus:border-primary-400" />
                    <datalist id="deep-link-options">
                      <option value="tab:home">Trang chủ</option>
                      <option value="tab:vocabulary">Từ vựng</option>
                      <option value="tab:dictionary">Tra từ</option>
                      <option value="tab:progress">Tiến độ</option>
                      <option value="tab:settings">Cài đặt</option>
                    </datalist>
                  </div>
                </div>

                {/* Advanced Toggle */}
                <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs font-semibold text-gray-400 hover:text-gray-600 cursor-pointer flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {showAdvanced ? "Ẩn tuỳ chọn nâng cao" : "Hiện tuỳ chọn nâng cao"}
                </button>

                {showAdvanced && (
                  <div className="space-y-4 p-4 bg-gray-50/50 rounded-xl border border-border-color">
                    {/* Gradient */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Gradient nền (Light)</label>
                        <div className="flex gap-2">
                          <input type="color" value={form.bgGradient?.[0] || "#3b82f6"}
                            onChange={e => upd("bgGradient", [e.target.value, form.bgGradient?.[1] || ""])}
                            className="w-10 h-10 rounded-lg cursor-pointer border-0" />
                          <input type="color" value={form.bgGradient?.[1] || "#6366f1"}
                            onChange={e => upd("bgGradient", [form.bgGradient?.[0] || "", e.target.value])}
                            className="w-10 h-10 rounded-lg cursor-pointer border-0" />
                          <div className="flex-1 h-10 rounded-lg" style={{ background: `linear-gradient(135deg, ${form.bgGradient?.[0] || previewGradient[0]}, ${form.bgGradient?.[1] || previewGradient[1]})` }} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Gradient nền (Dark)</label>
                        <div className="flex gap-2">
                          <input type="color" value={form.darkBgGradient?.[0] || "#1e293b"}
                            onChange={e => upd("darkBgGradient", [e.target.value, form.darkBgGradient?.[1] || ""])}
                            className="w-10 h-10 rounded-lg cursor-pointer border-0" />
                          <input type="color" value={form.darkBgGradient?.[1] || "#334155"}
                            onChange={e => upd("darkBgGradient", [form.darkBgGradient?.[0] || "", e.target.value])}
                            className="w-10 h-10 rounded-lg cursor-pointer border-0" />
                          <div className="flex-1 h-10 rounded-lg" style={{ background: `linear-gradient(135deg, ${form.darkBgGradient?.[0] || "#1e293b"}, ${form.darkBgGradient?.[1] || "#334155"})` }} />
                        </div>
                      </div>
                    </div>

                    {/* Illustration + Badge + Targeting */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Illustration URL</label>
                        <input type="text" value={form.illustrationUrl || ""} onChange={e => upd("illustrationUrl", e.target.value)}
                          placeholder="https://..." className="w-full px-3 py-2 bg-surface border border-border-color rounded-xl text-xs outline-none" />
                        {form.illustrationUrl && (
                          <img src={form.illustrationUrl} alt="preview" className="mt-1.5 w-full h-16 object-contain rounded-lg bg-gray-100" onError={e => { e.target.style.display = 'none'; }} />
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Badge</label>
                        <input type="text" value={form.badge || ""} onChange={e => upd("badge", e.target.value)}
                          placeholder="NEW, HOT" className="w-full px-3 py-2 bg-surface border border-border-color rounded-xl text-xs outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Image Size (Mobile)</label>
                        <div className="flex gap-1">
                          {IMAGE_SIZES.map(({ value, label, px }) => (
                            <button key={value} type="button" onClick={() => upd("imageSize", value)}
                              title={px}
                              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${form.imageSize === value ? "bg-gray-800 text-white border-gray-800" : "bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100"}`}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Targeting */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Min Level</label>
                        <input type="number" value={form.targetMinLevel} onChange={e => upd("targetMinLevel", parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-surface border border-border-color rounded-xl text-xs outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Platform</label>
                        <div className="flex gap-1">
                          {PLATFORMS.map(({ value, label }) => (
                            <button key={value} type="button" onClick={() => upd("targetPlatform", value)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${form.targetPlatform === value ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100"}`}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Device Preview */}
                {(() => {
                  const device = DEVICES[selectedDevice] || DEVICES[0];
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5" />
                          Preview — {DISPLAY_MODES.find(m => m.value === form.displayMode)?.label || "Banner"}
                        </p>
                        <button type="button" onClick={() => setPreviewZoom(device)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-[10px] font-semibold text-gray-500 cursor-pointer transition-colors">
                          <Maximize2 className="w-3 h-3" /> Phóng to
                        </button>
                      </div>
                      {/* Device selector tabs */}
                      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-3 overflow-x-auto">
                        {DEVICES.map((d, i) => (
                          <button key={d.name} type="button" onClick={() => setSelectedDevice(i)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                              selectedDevice === i ? "bg-white text-foreground shadow-sm" : "text-gray-400 hover:text-gray-600"
                            }`}>
                            <d.icon className="w-3 h-3" />
                            {d.name}
                            {d.os === 'android' && <span className="text-[8px] text-green-500">●</span>}
                            {d.os === 'ios' && <span className="text-[8px] text-gray-400">●</span>}
                          </button>
                        ))}
                      </div>
                      {/* Single device frame */}
                      <div className="flex justify-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="relative bg-gray-900 p-2 shadow-xl" style={{ borderRadius: device.r + 4, width: device.w + 16 }}>
                            {/* Status bar */}
                            <div className="flex items-center justify-between px-4 py-1 text-white" style={{ fontSize: 8 }}>
                              <span>9:41</span>
                              <div className="flex gap-1 text-[7px]">📶 🔋</div>
                            </div>
                            {/* Screen */}
                            <div className="bg-white overflow-hidden relative" style={{ borderRadius: device.r, width: device.w, height: device.h }}>
                              <div className="relative" style={{
                                background: `linear-gradient(135deg, ${previewGradient[0]}, ${previewGradient[1]})`,
                                padding: form.displayMode === 'popup' ? '24px 14px' : '12px 14px',
                                margin: form.displayMode === 'bottom_sheet' ? `${device.h - 160}px 0 0 0` : form.displayMode === 'popup' ? `${(device.h - 220) / 2}px 10px` : '8px',
                                borderRadius: form.displayMode === 'popup' ? 16 : form.displayMode === 'bottom_sheet' ? '16px 16px 0 0' : 12,
                                minHeight: form.displayMode === 'popup' ? 220 : form.displayMode === 'bottom_sheet' ? 160 : undefined,
                                boxShadow: form.displayMode !== 'banner' ? '0 -4px 20px rgba(0,0,0,0.15)' : undefined,
                              }}>
                                {form.displayMode === 'bottom_sheet' && (
                                  <div className="flex justify-center mb-2"><div className="w-8 h-1 bg-white/30 rounded-full" /></div>
                                )}
                                <div className="flex items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    {form.badge && <span className="inline-block px-2 py-0.5 bg-white/25 text-white font-bold rounded-full mb-1" style={{ fontSize: 7 }}>{form.badge}</span>}
                                    <p className="text-white font-bold truncate" style={{ fontSize: form.displayMode === 'popup' ? 12 : 10 }}>{form.title || "Tiêu đề"}</p>
                                    {form.subtitle && <p className="text-white/80 truncate" style={{ fontSize: 8 }}>{form.subtitle}</p>}
                                    <p className="text-white/70 mt-0.5" style={{ fontSize: 7, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{form.message || "Nội dung..."}</p>
                                    {form.ctaText && (
                                      <span className={`inline-block px-3 py-1 rounded-full mt-2 font-bold ${form.ctaStyle === 'primary' ? 'bg-white text-gray-800' : form.ctaStyle === 'secondary' ? 'bg-white/20 text-white border border-white/30' : 'text-white underline'}`} style={{ fontSize: 7 }}>{form.ctaText}</span>
                                    )}
                                  </div>
                                  {form.illustrationUrl && (
                                    <img src={form.illustrationUrl} alt="" className="object-contain rounded flex-shrink-0" style={{ width: form.imageSize === 'large' ? 40 : form.imageSize === 'medium' ? 28 : 20, height: form.imageSize === 'large' ? 40 : form.imageSize === 'medium' ? 28 : 20 }} onError={e => { e.target.style.display = 'none'; }} />
                                  )}
                                </div>
                              </div>
                              {form.displayMode === 'banner' && (
                                <div className="px-3 pt-2 space-y-2">
                                  <div className="h-2.5 bg-gray-100 rounded-full w-3/4" />
                                  <div className="h-8 bg-gray-50 rounded-lg" />
                                  <div className="h-8 bg-gray-50 rounded-lg" />
                                  <div className="h-2.5 bg-gray-100 rounded-full w-1/2" />
                                </div>
                              )}
                              {form.displayMode === 'popup' && <div className="absolute inset-0 bg-black/40" style={{ borderRadius: device.r, zIndex: -1 }} />}
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-400 font-semibold">{device.name} • {device.w}×{device.h}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}



                {/* Submit */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-color">
                  <button type="button" onClick={onClose} disabled={loading}
                    className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 cursor-pointer">
                    Huỷ
                  </button>
                  <button type="submit" disabled={loading}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-red-500 rounded-xl hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isEdit ? "Cập nhật" : "Tạo thông báo"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>

          {/* Zoom Preview Modal (Rendered outside motion.div to avoid stacking context issues) */}
          {previewZoom && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-8" onClick={() => setPreviewZoom(null)}>
              <div className="relative bg-gray-900 p-3 shadow-2xl max-h-[90vh] overflow-auto" style={{ borderRadius: 36 }} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-1.5 text-white text-xs">
                  <span>9:41</span>
                  <div className="flex gap-1.5">📶 🔋</div>
                </div>
                <div className="bg-white overflow-hidden" style={{ borderRadius: 30, width: 375, height: 720 }}>
                  <div className="relative" style={{
                    background: `linear-gradient(135deg, ${previewGradient[0]}, ${previewGradient[1]})`,
                    padding: form.displayMode === 'popup' ? '36px 20px' : '16px 20px',
                    margin: form.displayMode === 'bottom_sheet' ? '560px 0 0 0' : form.displayMode === 'popup' ? '220px 16px' : '12px',
                    borderRadius: form.displayMode === 'popup' ? 24 : form.displayMode === 'bottom_sheet' ? '24px 24px 0 0' : 16,
                    boxShadow: form.displayMode !== 'banner' ? '0 -8px 30px rgba(0,0,0,0.2)' : '0 4px 12px rgba(0,0,0,0.15)',
                  }}>
                    {form.displayMode === 'bottom_sheet' && (
                      <div className="flex justify-center mb-3"><div className="w-10 h-1 bg-white/30 rounded-full" /></div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        {form.badge && <span className="inline-block px-2.5 py-0.5 bg-white/25 text-white text-[10px] font-bold rounded-full mb-2">{form.badge}</span>}
                        <p className="text-white font-bold" style={{ fontSize: form.displayMode === 'popup' ? 20 : 16 }}>{form.title || "Tiêu đề"}</p>
                        {form.subtitle && <p className="text-white/80 text-xs mt-1">{form.subtitle}</p>}
                        <p className="text-white/70 text-sm mt-2 leading-relaxed">{form.message || "Nội dung thông báo..."}</p>
                        {form.ctaText && (
                          <div className="mt-4">
                            <span className={`inline-block px-5 py-2 rounded-full text-xs font-bold ${form.ctaStyle === 'primary' ? 'bg-white text-gray-800' : form.ctaStyle === 'secondary' ? 'bg-white/20 text-white border border-white/30' : 'text-white underline'}`}>{form.ctaText}</span>
                          </div>
                        )}
                        {form.displayMode !== 'banner' && <p className="text-white/40 text-xs mt-4 text-center">Đóng</p>}
                      </div>
                      {form.illustrationUrl && (
                        <img src={form.illustrationUrl} alt="" className="object-contain rounded-xl flex-shrink-0" style={{ width: form.imageSize === 'large' ? 120 : form.imageSize === 'medium' ? 80 : 48, height: form.imageSize === 'large' ? 120 : form.imageSize === 'medium' ? 80 : 48 }} onError={e => { e.target.style.display = 'none'; }} />
                      )}
                    </div>
                  </div>
                  {form.displayMode === 'banner' && (
                    <div className="px-4 pt-3 space-y-3"><div className="h-3 bg-gray-100 rounded-full w-2/3" /><div className="h-12 bg-gray-50 rounded-xl" /><div className="h-12 bg-gray-50 rounded-xl" /></div>
                  )}
                  {form.displayMode === 'popup' && <div className="absolute inset-0 bg-black/40" style={{ borderRadius: 30, zIndex: -1 }} />}
                </div>
                <p className="text-center text-gray-400 text-xs mt-2 font-semibold">{previewZoom.name} — Phóng to</p>
                <button onClick={() => setPreviewZoom(null)} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:bg-gray-100 z-50">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
