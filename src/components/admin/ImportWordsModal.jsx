"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2,
  Loader2, Download, Trash2, RefreshCw, Pencil, RotateCcw, Undo2,
} from "lucide-react";
import { checkDuplicateWords } from "@/lib/adminService";

/**
 * Parse CSV text into array of objects
 * Handles quoted fields, commas inside quotes, and newlines
 */
function parseCSV(rawText) {
  // Strip BOM if present
  const text = rawText.replace(/^\uFEFF/, "");
  
  // Detect delimiter (comma or semicolon)
  const firstLine = text.split('\n')[0] || '';
  const delimiter = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';

  const lines = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      lines.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && text[i + 1] === "\n") i++; // skip \r\n
      lines.push(current);
      lines.push("ROW_BREAK");
      current = "";
    } else {
      current += char;
    }
  }
  lines.push(current);

  // Rebuild rows
  const rows = [];
  let row = [];
  for (const cell of lines) {
    if (cell === "ROW_BREAK") {
      if (row.length > 0) rows.push(row);
      row = [];
    } else {
      row.push(cell.trim());
    }
  }
  if (row.length > 0) rows.push(row);

  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = r[i] || "";
    });
    return obj;
  });
}

const REQUIRED_FIELDS = ["word", "meaning"];
const OPTIONAL_FIELDS = [
  "pronunciation",
  "example",
  "topic_id",
  "pos",
  "difficulty_level",
];

const TEMPLATE_CSV = `word,pronunciation,meaning,example,topic_id,pos,difficulty_level
environment,/ɪnˈvaɪ.rən.mənt/,Môi trường,We need to protect the environment.,,noun,2
sustainable,/səˈsteɪ.nə.bəl/,Bền vững,Sustainable development is important.,,adj,3`;

/**
 * ImportWordsModal — Batch import words from CSV/JSON
 */
export default function ImportWordsModal({
  open,
  onClose,
  onImport,
  topics = [],
}) {
  const fileRef = useRef(null);
  const [step, setStep] = useState("upload"); // upload | preview | importing | done
  const [parsedWords, setParsedWords] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [topicOverride, setTopicOverride] = useState("");
  const [fileName, setFileName] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [duplicateMap, setDuplicateMap] = useState({});
  const [checkingDupes, setCheckingDupes] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // { row: number, field: string }
  const [undoStack, setUndoStack] = useState([]); // array of parsedWords snapshots

  // Build flat topic list
  const parentTopics = topics.filter((t) => !t.parent_id);
  const flatTopics = [];
  parentTopics.forEach((parent) => {
    flatTopics.push(parent);
    const children = topics.filter((t) => t.parent_id === parent.id);
    children.forEach((child) => flatTopics.push({ ...child, _isChild: true }));
  });

  function reset() {
    setStep("upload");
    setParsedWords([]);
    setValidationErrors([]);
    setTopicOverride("");
    setFileName("");
    setImportResult(null);
    setDragOver(false);
    setDuplicateMap({});
    setCheckingDupes(false);
    setEditingCell(null);
    setUndoStack([]);
  }

  // Save snapshot for undo before any mutation
  function pushUndo() {
    setUndoStack(prev => [...prev.slice(-19), parsedWords.map(w => ({ ...w }))]);
  }

  function handleUndo() {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    setParsedWords(prev);
    // Revalidate with restored data
    const errors = [];
    const seen = {};
    prev.forEach((w, i) => {
      w._internalDupe = false;
      REQUIRED_FIELDS.forEach(field => {
        if (!w[field]?.trim()) {
          errors.push({ index: i, error: `D\u00f2ng ${i + 1}: thi\u1ebfu "${field}"` });
        }
      });
      const key = w.word?.trim().toLowerCase();
      if (key) {
        if (seen[key] !== undefined) {
          errors.push({ index: i, error: `D\u00f2ng ${i + 1}: tr\u00f9ng v\u1edbi d\u00f2ng ${seen[key] + 1} ("${w.word}")` });
          w._internalDupe = true;
        } else {
          seen[key] = i;
        }
      }
    });
    setValidationErrors(errors);
  }

  // Inline edit: update a cell value and revalidate
  function handleCellEdit(rowIndex, field, value) {
    pushUndo();
    setParsedWords(prev => {
      const updated = [...prev];
      updated[rowIndex] = { ...updated[rowIndex], [field]: value };
      return updated;
    });
  }

  // Delete a row from the preview
  function handleDeleteRow(rowIndex) {
    pushUndo();
    setParsedWords(prev => prev.filter((_, i) => i !== rowIndex));
    setTimeout(() => revalidate(), 0);
  }

  function commitEdit() {
    if (!editingCell) return;
    setEditingCell(null);
    // Revalidate after edit
    revalidate();
  }

  function revalidate() {
    setParsedWords(prev => {
      const errors = [];
      const seen = {};
      prev.forEach((w, i) => {
        w._internalDupe = false; // reset
        REQUIRED_FIELDS.forEach(field => {
          if (!w[field]?.trim()) {
            errors.push({ index: i, error: `Dòng ${i + 1}: thiếu "${field}"` });
          }
        });
        const key = w.word?.trim().toLowerCase();
        if (key) {
          if (seen[key] !== undefined) {
            errors.push({ index: i, error: `Dòng ${i + 1}: trùng với dòng ${seen[key] + 1} ("${w.word}")` });
            w._internalDupe = true;
          } else {
            seen[key] = i;
          }
        }
      });
      setValidationErrors(errors);
      return [...prev];
    });
  }

  function handleClose() {
    reset();
    onClose();
  }

  function processFile(file) {
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      let words = [];

      try {
        if (ext === "json") {
          const parsed = JSON.parse(text);
          words = Array.isArray(parsed) ? parsed : [parsed];
        } else if (ext === "csv" || ext === "txt") {
          words = parseCSV(text);
        } else {
          setValidationErrors([
            { index: -1, error: `Định dạng .${ext} không được hỗ trợ. Chỉ hỗ trợ .csv và .json` },
          ]);
          return;
        }
      } catch (err) {
        setValidationErrors([
          { index: -1, error: `Lỗi đọc file: ${err.message}` },
        ]);
        return;
      }

      // Validate
      const errors = [];
      words.forEach((w, i) => {
        REQUIRED_FIELDS.forEach((field) => {
          if (!w[field]?.trim()) {
            errors.push({
              index: i,
              error: `Dòng ${i + 1}: thiếu "${field}"`,
            });
          }
        });
        // Parse difficulty_level to number
        if (w.difficulty_level) {
          w.difficulty_level = parseInt(w.difficulty_level) || 1;
        }
      });

      setValidationErrors(errors);

      // Detect internal CSV duplicates (same word appears multiple times)
      const seen = {};
      words.forEach((w, i) => {
        const key = w.word?.trim().toLowerCase();
        if (!key) return;
        if (seen[key] !== undefined) {
          errors.push({ index: i, error: `Dòng ${i + 1}: trùng với dòng ${seen[key] + 1} ("${w.word}")` });
          w._internalDupe = true;
        } else {
          seen[key] = i;
        }
      });
      setValidationErrors(errors);

      setParsedWords(words);
      setStep("preview");

      // Check duplicates against DB
      const wordList = words.map((w) => w.word).filter(Boolean);
      if (wordList.length > 0) {
        setCheckingDupes(true);
        try {
          const dupes = await checkDuplicateWords(wordList);
          setDuplicateMap(dupes);
        } catch { /* ignore */ }
        setCheckingDupes(false);
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  function handleFileDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    processFile(file);
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    processFile(file);
  }

  async function handleImport() {
    setStep("importing");

    // Apply topic override
    const wordsToImport = parsedWords
      .filter((w) => w.word?.trim() && w.meaning?.trim())
      .map((w) => ({
        ...w,
        topic_id: w.topic_id || topicOverride || "",
        difficulty_level: w.difficulty_level || 1,
      }));

    try {
      const result = await onImport(wordsToImport);
      setImportResult(result);
      setStep("done");
    } catch (err) {
      setImportResult({ imported: 0, errors: [{ error: err.message }] });
      setStep("done");
    }
  }

  function downloadTemplate() {
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + TEMPLATE_CSV], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vocabulary_import_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const validCount = parsedWords.filter(
    (w) => w.word?.trim() && w.meaning?.trim() && (w.topic_id?.trim() || topicOverride)
  ).length;
  const invalidCount = parsedWords.length - validCount;
  const dupeCount = parsedWords.filter(
    (w) => duplicateMap[w.word?.trim().toLowerCase()] || w._internalDupe
  ).length;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[90vh] z-50 p-4"
          >
            <div className="bg-surface-elevated rounded-2xl shadow-xl border border-border-color overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-color bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <Upload className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Import từ vựng
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      {step === "upload" && "Tải lên file CSV hoặc JSON"}
                      {step === "preview" && `Xem trước ${parsedWords.length} từ từ "${fileName}"`}
                      {step === "importing" && "Đang import..."}
                      {step === "done" && "Hoàn tất"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-lg hover:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
                {/* ─── STEP: Upload ─── */}
                {step === "upload" && (
                  <div className="space-y-4">
                    {/* Drop zone */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleFileDrop}
                      onClick={() => fileRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                        dragOver
                          ? "border-emerald-400 bg-emerald-50/50"
                          : "border-border-color hover:border-primary-400 hover:bg-primary-50/20"
                      }`}
                    >
                      <FileSpreadsheet
                        className={`w-12 h-12 mx-auto mb-3 ${
                          dragOver ? "text-emerald-500" : "text-gray-300"
                        }`}
                      />
                      <p className="text-sm font-semibold text-foreground mb-1">
                        Kéo thả file vào đây
                      </p>
                      <p className="text-xs text-gray-400">
                        hoặc click để chọn file • Hỗ trợ .csv, .json
                      </p>
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".csv,.json,.txt"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>

                    {/* Template download */}
                    <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                      <div>
                        <p className="text-sm font-semibold text-blue-700">
                          Tải template CSV mẫu
                        </p>
                        <p className="text-xs text-blue-500 mt-0.5">
                          Columns: word, pronunciation, meaning, example,
                          topic_id, pos, difficulty_level
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadTemplate();
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white text-xs font-semibold rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
                    </div>

                    {/* Validation errors from file read */}
                    {validationErrors.length > 0 && (
                      <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                        {validationErrors.map((err, i) => (
                          <p key={i} className="text-sm text-red-600">
                            <AlertCircle className="w-4 h-4 inline mr-1" />
                            {err.error}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ─── STEP: Preview ─── */}
                {step === "preview" && (
                  <div className="space-y-4">
                    {/* Stats */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-semibold text-emerald-700">
                          {validCount} hợp lệ
                        </span>
                      </div>
                      {invalidCount > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-semibold text-red-700">
                            {invalidCount} lỗi
                          </span>
                        </div>
                      )}
                      {dupeCount > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg">
                          <RefreshCw className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-semibold text-amber-700">
                            {dupeCount} trùng lặp
                          </span>
                        </div>
                      )}
                      {checkingDupes && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                          <span className="text-xs text-gray-500">Kiểm tra trùng...</span>
                        </div>
                      )}
                    </div>

                    {/* Topic override */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Ghi đè chủ đề (cho tất cả từ chưa có topic_id)
                      </label>
                      <select
                        value={topicOverride}
                        onChange={(e) => setTopicOverride(e.target.value)}
                        className="w-full sm:w-auto px-4 py-2.5 bg-surface border border-border-color rounded-xl text-sm outline-none cursor-pointer"
                      >
                        <option value="">— Giữ nguyên từ file —</option>
                        {flatTopics.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t._isChild ? "  ↳ " : ""}
                            {t.name}
                          </option>
                        ))}
                      </select>
                      {parsedWords.some(w => w.word?.trim() && w.meaning?.trim() && !w.topic_id?.trim()) && !topicOverride && (
                        <p className="text-xs font-semibold text-red-500 mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Có từ vựng bị thiếu Chủ đề. Bạn phải chọn "Ghi đè chủ đề" hoặc sửa trong file CSV để tránh tạo từ mồ côi!
                        </p>
                      )}
                    </div>

                    {/* Validation errors */}
                    {validationErrors.length > 0 && (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 max-h-24 overflow-y-auto">
                        {validationErrors.slice(0, 10).map((err, i) => (
                          <p
                            key={i}
                            className="text-xs text-amber-700 py-0.5"
                          >
                            ⚠ {err.error}
                          </p>
                        ))}
                        {validationErrors.length > 10 && (
                          <p className="text-xs text-amber-500 mt-1">
                            ...và {validationErrors.length - 10} lỗi khác
                          </p>
                        )}
                      </div>
                    )}

                    {/* Preview table */}
                    <div className="rounded-xl border border-border-color overflow-hidden">
                      <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50/80 sticky top-0 z-10">
                            <tr>
                              <th className="text-left px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                #
                              </th>
                              <th className="text-left px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                Word
                              </th>
                              <th className="text-left px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                Meaning
                              </th>
                              <th className="text-left px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                POS
                              </th>
                              <th className="text-left px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                Lv
                              </th>
                              <th className="text-left px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                Status
                              </th>
                              <th className="text-center px-2 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide w-10">
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-color">
                            {parsedWords.slice(0, 50).map((w, i) => {
                              const isValid = w.word?.trim() && w.meaning?.trim() && (w.topic_id?.trim() || topicOverride);
                              const isDupe = duplicateMap[w.word?.trim().toLowerCase()] || w._internalDupe;
                              const isEditing = (field) => editingCell?.row === i && editingCell?.field === field;
                              return (
                                <tr
                                  key={i}
                                  className={!isValid ? "bg-red-50/30" : isDupe ? "bg-amber-50/30" : "hover:bg-gray-50/50"}
                                >
                                  <td className="px-3 py-2 text-xs text-gray-400 font-mono">{i + 1}</td>
                                  <td className="px-3 py-1.5">
                                    {isEditing("word") ? (
                                      <input
                                        autoFocus
                                        className="w-full px-2 py-1 text-sm border border-blue-400 rounded-lg outline-none bg-white font-medium"
                                        defaultValue={w.word || ""}
                                        onBlur={(e) => { handleCellEdit(i, "word", e.target.value); commitEdit(); }}
                                        onKeyDown={(e) => { if (e.key === "Enter") { handleCellEdit(i, "word", e.target.value); commitEdit(); } if (e.key === "Escape") setEditingCell(null); }}
                                      />
                                    ) : (
                                      <span
                                        className="font-medium text-foreground cursor-pointer hover:text-blue-600 inline-flex items-center gap-1 group"
                                        onClick={() => setEditingCell({ row: i, field: "word" })}
                                      >
                                        {w.word || <span className="text-red-400 italic">missing</span>}
                                        <Pencil className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-1.5 max-w-[200px]">
                                    {isEditing("meaning") ? (
                                      <input
                                        autoFocus
                                        className="w-full px-2 py-1 text-sm border border-blue-400 rounded-lg outline-none bg-white"
                                        defaultValue={w.meaning || ""}
                                        onBlur={(e) => { handleCellEdit(i, "meaning", e.target.value); commitEdit(); }}
                                        onKeyDown={(e) => { if (e.key === "Enter") { handleCellEdit(i, "meaning", e.target.value); commitEdit(); } if (e.key === "Escape") setEditingCell(null); }}
                                      />
                                    ) : (
                                      <span
                                        className="text-gray-600 cursor-pointer hover:text-blue-600 inline-flex items-center gap-1 group truncate"
                                        onClick={() => setEditingCell({ row: i, field: "meaning" })}
                                      >
                                        {w.meaning || <span className="text-red-400 italic">missing</span>}
                                        <Pencil className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-gray-500">{w.pos || "—"}</td>
                                  <td className="px-3 py-2 text-xs text-gray-500">{w.difficulty_level || 1}</td>
                                  <td className="px-3 py-2">
                                    {!isValid ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] text-red-500 font-medium">
                                        <AlertCircle className="w-3 h-3" />Lỗi
                                      </span>
                                    ) : isDupe ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                                        <RefreshCw className="w-3 h-3" />Trùng
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                                        <CheckCircle2 className="w-3 h-3" />OK
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    <button
                                      onClick={() => handleDeleteRow(i)}
                                      className="w-6 h-6 rounded-md hover:bg-red-50 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors cursor-pointer mx-auto"
                                      title="Xoá dòng này"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {parsedWords.length > 50 && (
                        <div className="px-4 py-2 bg-gray-50 text-xs text-gray-400 text-center border-t border-border-color">
                          Hiển thị 50/{parsedWords.length} dòng đầu tiên
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={reset}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          Chọn file khác
                        </button>
                        <button
                          onClick={handleUndo}
                          disabled={undoStack.length === 0}
                          className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Hoàn tác (Undo)"
                        >
                          <Undo2 className="w-4 h-4" />
                          Undo {undoStack.length > 0 && `(${undoStack.length})`}
                        </button>
                      </div>
                      <button
                        onClick={handleImport}
                        disabled={validCount === 0}
                        className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4" />
                        Import {validCount} từ
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── STEP: Importing ─── */}
                {step === "importing" && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    </div>
                    <p className="text-lg font-bold text-foreground mb-1">
                      Đang import...
                    </p>
                    <p className="text-sm text-gray-400">
                      {validCount} từ đang được thêm vào hệ thống
                    </p>
                    <div className="mt-6 max-w-xs mx-auto">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                          initial={{ width: "5%" }}
                          animate={{ width: "85%" }}
                          transition={{ duration: 3, ease: "easeInOut" }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── STEP: Done ─── */}
                {step === "done" && importResult && (
                  <div className="text-center py-8 space-y-4">
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
                        importResult.imported > 0
                          ? "bg-emerald-50"
                          : "bg-red-50"
                      }`}
                    >
                      {importResult.imported > 0 ? (
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-8 h-8 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {importResult.imported > 0
                          ? "Import thành công!"
                          : "Import thất bại"}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Đã import{" "}
                        <span className="font-bold text-emerald-600">
                          {importResult.imported}
                        </span>{" "}
                        từ
                        {importResult.errors?.length > 0 && (
                          <span>
                            {" "}
                            •{" "}
                            <span className="text-red-500">
                              {importResult.errors.length} lỗi
                            </span>
                          </span>
                        )}
                      </p>
                    </div>

                    {importResult.errors?.length > 0 && (
                      <div className="text-left p-3 bg-red-50 rounded-xl max-h-32 overflow-y-auto">
                        {importResult.errors.map((err, i) => (
                          <p key={i} className="text-xs text-red-600 py-0.5">
                            • {err.error || JSON.stringify(err)}
                          </p>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-3">
                      {importResult.imported === 0 || importResult.errors?.length > 0 ? (
                        <>
                          <button
                            onClick={() => { setStep("preview"); setImportResult(null); }}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Quay lại sửa
                          </button>
                          {importResult.imported > 0 && (
                            <button
                              onClick={handleClose}
                              className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl hover:shadow-lg transition-all cursor-pointer"
                            >
                              Đóng
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={handleClose}
                          className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl hover:shadow-lg transition-all cursor-pointer"
                        >
                          Đóng
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
