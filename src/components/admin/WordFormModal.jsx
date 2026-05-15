"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Sparkles, AlertTriangle, Wand2 } from "lucide-react";
import { checkDuplicateWords } from "@/lib/adminService";

/**
 * WordFormModal — Create or Edit a vocabulary word
 */
export default function WordFormModal({
  open,
  onClose,
  onSubmit,
  initialData = null,
  topics = [],
  loading = false,
}) {
  const isEdit = !!initialData;

  const [form, setForm] = useState({
    word: "",
    pronunciation: "",
    meaning: "",
    example: "",
    topic_id: "",
    pos: "",
    difficulty_level: 1,
    image_url: "",
    audio_url: "",
  });

  const [errors, setErrors] = useState({});
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (initialData) {
      setForm({
        word: initialData.word || "",
        pronunciation: initialData.pronunciation || "",
        meaning: initialData.meaning || "",
        example: initialData.example || "",
        topic_id: initialData.topic_id || "",
        pos: initialData.pos || "",
        difficulty_level: initialData.difficulty_level || 1,
        image_url: initialData.image_url || "",
        audio_url: initialData.audio_url || "",
      });
    } else {
      setForm({
        word: "",
        pronunciation: "",
        meaning: "",
        example: "",
        topic_id: "",
        pos: "",
        difficulty_level: 1,
        image_url: "",
        audio_url: "",
      });
    }
    setErrors({});
    setDuplicateWarning(null);
  }, [initialData, open]);

  // Duplicate detection with debounce
  useEffect(() => {
    if (isEdit) return; // skip check when editing existing word
    const word = form.word.trim().toLowerCase();
    if (word.length < 3) { setDuplicateWarning(null); return; }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const dupes = await checkDuplicateWords([form.word]);
        const key = word;
        if (dupes[key]) {
          setDuplicateWarning(`Từ "${dupes[key].word}" đã tồn tại trong hệ thống`);
        } else {
          setDuplicateWarning(null);
        }
      } catch { setDuplicateWarning(null); }
    }, 500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.word, isEdit]);

  const POS_OPTIONS = [
    { value: "", label: "— Chọn —" },
    { value: "noun", label: "Danh từ (noun)" },
    { value: "verb", label: "Động từ (verb)" },
    { value: "adj", label: "Tính từ (adj)" },
    { value: "adv", label: "Trạng từ (adv)" },
    { value: "prep", label: "Giới từ (prep)" },
    { value: "conj", label: "Liên từ (conj)" },
    { value: "pron", label: "Đại từ (pron)" },
    { value: "det", label: "Mạo từ (det)" },
    { value: "intj", label: "Thán từ (intj)" },
    { value: "phrase", label: "Cụm từ (phrase)" },
  ];

  function validate() {
    const errs = {};
    if (!form.word.trim()) errs.word = "Bắt buộc";
    if (!form.meaning.trim()) errs.meaning = "Bắt buộc";
    if (!form.topic_id) errs.topic_id = "Bắt buộc";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form);
  }

  async function handleAutoFill() {
    if (!form.word.trim()) return;
    setAutoFillLoading(true);
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(form.word.trim())}`);
      if (!res.ok) throw new Error("Không tìm thấy từ này trong từ điển API");
      const data = await res.json();
      const entry = data[0];
      
      let pronunciation = "";
      if (entry.phonetics) {
        const phonetic = entry.phonetics.find(p => p.text);
        if (phonetic) pronunciation = phonetic.text;
        else pronunciation = entry.phonetic || "";
      }
      
      let meaning = "";
      let example = "";
      let pos = "";
      
      if (entry.meanings && entry.meanings.length > 0) {
        const m = entry.meanings[0];
        pos = m.partOfSpeech || "";
        if (m.definitions && m.definitions.length > 0) {
          meaning = m.definitions[0].definition;
          example = m.definitions[0].example || "";
        }
      }

      const posMap = {
        "noun": "noun", "verb": "verb", "adjective": "adj", "adverb": "adv",
        "preposition": "prep", "conjunction": "conj", "pronoun": "pron",
        "interjection": "intj"
      };
      
      setForm(prev => ({
        ...prev,
        pronunciation: prev.pronunciation || pronunciation,
        meaning: prev.meaning || meaning,
        example: prev.example || example,
        pos: posMap[pos.toLowerCase()] || prev.pos || "",
      }));
    } catch (err) {
      alert(err.message);
    }
    setAutoFillLoading(false);
  }

  const updateField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // Build flat topic list with hierarchy indicators
  const parentTopics = topics.filter((t) => !t.parent_id);
  const flatTopics = [];
  parentTopics.forEach((parent) => {
    flatTopics.push(parent);
    const children = topics.filter((t) => t.parent_id === parent.id);
    children.forEach((child) => flatTopics.push({ ...child, _isChild: true }));
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] z-50 p-4"
          >
            <div className="bg-surface-elevated rounded-2xl shadow-xl border border-border-color overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-color bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      {isEdit ? "Chỉnh sửa từ" : "Thêm từ mới"}
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      {isEdit ? "Cập nhật thông tin từ vựng" : "Thêm từ vào hệ thống"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg hover:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[calc(90vh-140px)] overflow-y-auto">
                {/* Word + Pronunciation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-gray-600">
                        Từ tiếng Anh <span className="text-red-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleAutoFill}
                        disabled={autoFillLoading || !form.word.trim()}
                        className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-600 rounded text-[10px] font-semibold hover:bg-purple-100 disabled:opacity-50 transition-colors"
                      >
                        {autoFillLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                        Auto-fill
                      </button>
                    </div>
                    <input
                      type="text"
                      value={form.word}
                      onChange={(e) => updateField("word", e.target.value)}
                      placeholder="e.g. example"
                      className={`w-full px-4 py-2.5 bg-surface border rounded-xl text-sm outline-none transition-colors ${
                        errors.word ? "border-red-400 focus:border-red-500" : "border-border-color focus:border-primary-400"
                      }`}
                    />
                    {errors.word && <p className="text-xs text-red-400 mt-1">{errors.word}</p>}
                    {duplicateWarning && (
                      <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {duplicateWarning}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Phiên âm (IPA)
                    </label>
                    <input
                      type="text"
                      value={form.pronunciation}
                      onChange={(e) => updateField("pronunciation", e.target.value)}
                      placeholder="e.g. /ɪɡˈzæm.pəl/"
                      className="w-full px-4 py-2.5 bg-surface border border-border-color rounded-xl text-sm outline-none focus:border-primary-400 transition-colors"
                    />
                  </div>
                </div>

                {/* Meaning */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Nghĩa tiếng Việt <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={form.meaning}
                    onChange={(e) => updateField("meaning", e.target.value)}
                    placeholder="Nhập nghĩa tiếng Việt..."
                    rows={2}
                    className={`w-full px-4 py-2.5 bg-surface border rounded-xl text-sm outline-none transition-colors resize-none ${
                      errors.meaning ? "border-red-400 focus:border-red-500" : "border-border-color focus:border-primary-400"
                    }`}
                  />
                  {errors.meaning && <p className="text-xs text-red-400 mt-1">{errors.meaning}</p>}
                </div>

                {/* Example */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Câu ví dụ
                  </label>
                  <textarea
                    value={form.example}
                    onChange={(e) => updateField("example", e.target.value)}
                    placeholder="This is an example sentence."
                    rows={2}
                    className="w-full px-4 py-2.5 bg-surface border border-border-color rounded-xl text-sm outline-none focus:border-primary-400 transition-colors resize-none"
                  />
                </div>

                {/* Topic + POS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Chủ đề <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={form.topic_id}
                      onChange={(e) => updateField("topic_id", e.target.value)}
                      className={`w-full px-4 py-2.5 bg-surface border rounded-xl text-sm outline-none transition-colors cursor-pointer ${
                        errors.topic_id ? "border-red-400" : "border-border-color focus:border-primary-400"
                      }`}
                    >
                      <option value="">— Chọn chủ đề —</option>
                      {flatTopics.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t._isChild ? "  ↳ " : ""}{t.name}
                        </option>
                      ))}
                    </select>
                    {errors.topic_id && <p className="text-xs text-red-400 mt-1">{errors.topic_id}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Loại từ
                    </label>
                    <select
                      value={form.pos}
                      onChange={(e) => updateField("pos", e.target.value)}
                      className="w-full px-4 py-2.5 bg-surface border border-border-color rounded-xl text-sm outline-none focus:border-primary-400 transition-colors cursor-pointer"
                    >
                      {POS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Difficulty + Image URL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Độ khó (1-5)
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => updateField("difficulty_level", level)}
                          className={`w-9 h-9 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                            form.difficulty_level === level
                              ? "bg-primary-500 text-white shadow-md shadow-primary-500/30"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Image URL
                    </label>
                    <input
                      type="text"
                      value={form.image_url}
                      onChange={(e) => updateField("image_url", e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-2.5 bg-surface border border-border-color rounded-xl text-sm outline-none focus:border-primary-400 transition-colors"
                    />
                  </div>
                </div>

                {/* Submit */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isEdit ? "Cập nhật" : "Tạo từ mới"}
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
