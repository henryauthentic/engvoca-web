"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  getAllWordsAdmin,
  getTopicsAdmin,
  createWord,
  updateWord,
  softDeleteWord,
  restoreWord,
  batchImportWords,
} from "@/lib/adminService";
import DataTable from "@/components/admin/DataTable";
import WordFormModal from "@/components/admin/WordFormModal";
import ImportWordsModal from "@/components/admin/ImportWordsModal";
import WordDetailDrawer from "@/components/admin/WordDetailDrawer";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { exportToCSV } from "@/lib/exportUtils";
import { motion } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Filter,
  Download,
  Upload,
  Eye,
  EyeOff,
} from "lucide-react";

const POS_LABELS = {
  noun: "Danh từ",
  verb: "Động từ",
  adj: "Tính từ",
  adv: "Trạng từ",
  prep: "Giới từ",
  conj: "Liên từ",
  pron: "Đại từ",
  phrase: "Cụm từ",
};

const DIFFICULTY_BADGES = {
  1: { label: "Dễ", cls: "admin-badge admin-badge-green" },
  2: { label: "TB", cls: "admin-badge admin-badge-blue" },
  3: { label: "Khó", cls: "admin-badge admin-badge-orange" },
  4: { label: "Rất khó", cls: "admin-badge admin-badge-red" },
  5: { label: "Expert", cls: "admin-badge admin-badge-red" },
};

export default function VocabularyPage() {
  const { user } = useAuth();
  const [words, setWords] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topicFilter, setTopicFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [posFilter, setPosFilter] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);

  // Bulk selection
  const [selectedWordIds, setSelectedWordIds] = useState([]);

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [editingWord, setEditingWord] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Import modal
  const [importOpen, setImportOpen] = useState(false);

  // Detail drawer
  const [detailWord, setDetailWord] = useState(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [wordsResult, topicsResult] = await Promise.all([
        getAllWordsAdmin({ pageSize: 500, topicFilter: topicFilter || null, includeDeleted: showDeleted }),
        getTopicsAdmin(),
      ]);
      setWords(wordsResult.words);
      setTopics(topicsResult);
    } catch (err) {
      console.error("Failed to load vocabulary:", err);
    }
    setLoading(false);
  }, [topicFilter, showDeleted]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Build topic name lookup
  const topicNameMap = {};
  topics.forEach((t) => {
    topicNameMap[t.id] = t.name;
  });

  // CRUD handlers
  async function handleCreateOrUpdate(formData) {
    setFormLoading(true);
    try {
      if (editingWord) {
        await updateWord(user.uid, editingWord.id, formData);
      } else {
        await createWord(user.uid, formData);
      }
      setFormOpen(false);
      setEditingWord(null);
      await loadData();
    } catch (err) {
      console.error("Failed to save word:", err);
      alert("Lỗi: " + err.message);
    }
    setFormLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await softDeleteWord(user.uid, deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      console.error("Failed to delete word:", err);
    }
    setDeleteLoading(false);
  }

  async function handleRestore(wordId) {
    try {
      await restoreWord(user.uid, wordId);
      await loadData();
    } catch (err) {
      console.error("Failed to restore word:", err);
    }
  }

  function openEdit(word) {
    setEditingWord(word);
    setFormOpen(true);
  }

  function openCreate() {
    setEditingWord(null);
    setFormOpen(true);
  }

  // Table columns
  const columns = [
    {
      key: "word",
      label: "Từ",
      width: "1.5fr",
      sortable: true,
      render: (val, row) => (
        <div>
          <p className={`text-sm font-semibold ${row.deleted ? "line-through text-gray-400" : "text-foreground"}`}>
            {val}
          </p>
          {row.pronunciation && (
            <p className="text-[11px] text-gray-400 mt-0.5">{row.pronunciation}</p>
          )}
        </div>
      ),
    },
    {
      key: "meaning",
      label: "Nghĩa",
      width: "2fr",
      render: (val) => (
        <p className="text-sm text-gray-600 truncate">{val || "—"}</p>
      ),
    },
    {
      key: "topic_id",
      label: "Chủ đề",
      width: "1fr",
      sortable: true,
      render: (val) => (
        <span className="admin-badge admin-badge-blue">
          {topicNameMap[val] || val || "—"}
        </span>
      ),
    },
    {
      key: "pos",
      label: "Loại",
      width: "0.7fr",
      render: (val) => (
        <span className="text-xs text-gray-500">{POS_LABELS[val] || val || "—"}</span>
      ),
    },
    {
      key: "difficulty_level",
      label: "Độ khó",
      width: "0.6fr",
      sortable: true,
      render: (val) => {
        const badge = DIFFICULTY_BADGES[val] || DIFFICULTY_BADGES[1];
        return <span className={badge.cls}>{badge.label}</span>;
      },
    },
    {
      key: "_actions",
      label: "",
      width: "100px",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {row.deleted ? (
            <button
              onClick={() => handleRestore(row.id)}
              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-500 transition-colors cursor-pointer"
              title="Khôi phục"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                onClick={() => openEdit(row)}
                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors cursor-pointer"
                title="Sửa"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeleteTarget(row)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors cursor-pointer"
                title="Xoá"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  // Group topics for filter dropdown
  const groupedTopics = topics.reduce((acc, topic) => {
    if (!topic.parent_id) {
      if (!acc[topic.id]) acc[topic.id] = { ...topic, children: [] };
      else acc[topic.id] = { ...acc[topic.id], ...topic };
    } else {
      if (!acc[topic.parent_id]) acc[topic.parent_id] = { children: [] };
      acc[topic.parent_id].children.push(topic);
    }
    return acc;
  }, {});

  const filteredWords = words.filter(w => {
    if (difficultyFilter && String(w.difficulty_level) !== difficultyFilter) return false;
    if (posFilter && w.pos !== posFilter) return false;
    return true;
  });

  // Bulk Handlers
  async function handleBulkDelete() {
    if (!selectedWordIds.length) return;
    if (!confirm(`Bạn có chắc muốn xoá ${selectedWordIds.length} từ đã chọn?`)) return;
    setLoading(true);
    try {
      await Promise.all(selectedWordIds.map(id => softDeleteWord(user.uid, id)));
      setSelectedWordIds([]);
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Lỗi khi xoá hàng loạt");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Từ vựng</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý {words.length.toLocaleString()} từ trong hệ thống
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const EXPORT_COLUMNS = [
                { key: "word", label: "word" },
                { key: "pronunciation", label: "pronunciation" },
                { key: "meaning", label: "meaning" },
                { key: "example", label: "example" },
                { key: "topic_id", label: "topic_id" },
                { key: "pos", label: "pos" },
                { key: "difficulty_level", label: "difficulty_level" },
              ];
              exportToCSV(words, EXPORT_COLUMNS, "vocabulary_export");
            }}
            className="flex items-center gap-2 px-3 py-2.5 bg-surface border border-border-color text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import</span>
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Thêm từ
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="px-3 py-2 bg-surface border border-border-color rounded-xl text-sm outline-none cursor-pointer max-w-[250px] truncate"
          >
            <option value="">Tất cả chủ đề</option>
            {Object.values(groupedTopics).map((parent) => (
              <optgroup key={parent.id || Math.random()} label={parent.name || "Khác"}>
                <option value={parent.id}>{parent.name} (Chung)</option>
                {parent.children?.map((child) => (
                  <option key={child.id} value={child.id}>
                    -- {child.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="px-3 py-2 bg-surface border border-border-color rounded-xl text-sm outline-none cursor-pointer"
          >
            <option value="">Mọi độ khó</option>
            {Object.entries(DIFFICULTY_BADGES).map(([lvl, badge]) => (
              <option key={lvl} value={lvl}>{badge.label}</option>
            ))}
          </select>

          <select
            value={posFilter}
            onChange={(e) => setPosFilter(e.target.value)}
            className="px-3 py-2 bg-surface border border-border-color rounded-xl text-sm outline-none cursor-pointer"
          >
            <option value="">Mọi loại từ</option>
            {Object.entries(POS_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowDeleted(!showDeleted)}
          className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-sm font-medium transition-colors cursor-pointer ${
            showDeleted
              ? "bg-red-50 border-red-200 text-red-600"
              : "bg-surface border-border-color text-gray-500 hover:bg-gray-50"
          }`}
        >
          {showDeleted ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {showDeleted ? "Hiện đã xoá" : "Ẩn đã xoá"}
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredWords}
        loading={loading}
        pageSize={20}
        searchable
        searchPlaceholder="Tìm từ vựng..."
        emptyMessage="Chưa có từ vựng nào"
        emptyIcon="📖"
        selectable={true}
        onSelectionChange={setSelectedWordIds}
        actions={
          selectedWordIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 font-medium px-2">Đã chọn {selectedWordIds.length}</span>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Xoá hàng loạt
              </button>
              {/* Đổi chủ đề hàng loạt có thể làm thêm 1 modal nhỏ, tạm thời cứ để Xoá trước */}
            </div>
          )
        }
        onRowClick={(row) => setDetailWord(row)}
      />

      {/* Word Detail Drawer */}
      <WordDetailDrawer
        open={!!detailWord}
        word={detailWord}
        onClose={() => setDetailWord(null)}
        onEdit={(w) => { setDetailWord(null); openEdit(w); }}
        onDelete={(w) => { setDetailWord(null); setDeleteTarget(w); }}
        onPrev={() => {
          const idx = words.findIndex((w) => w.id === detailWord?.id);
          if (idx > 0) setDetailWord(words[idx - 1]);
        }}
        onNext={() => {
          const idx = words.findIndex((w) => w.id === detailWord?.id);
          if (idx < words.length - 1) setDetailWord(words[idx + 1]);
        }}
        hasPrev={words.findIndex((w) => w.id === detailWord?.id) > 0}
        hasNext={words.findIndex((w) => w.id === detailWord?.id) < words.length - 1}
        topicName={detailWord ? topicNameMap[detailWord.topic_id] : ""}
      />

      {/* Word Form Modal */}
      <WordFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingWord(null); }}
        onSubmit={handleCreateOrUpdate}
        initialData={editingWord}
        topics={topics}
        loading={formLoading}
      />

      {/* Import Modal */}
      <ImportWordsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={async (wordsArray) => {
          const result = await batchImportWords(user.uid, wordsArray);
          await loadData();
          return result;
        }}
        topics={topics}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xoá từ vựng"
        message={`Bạn có chắc chắn muốn xoá "${deleteTarget?.word}"? Từ này sẽ được soft delete và có thể khôi phục sau.`}
        confirmText="Xoá"
        destructive
        loading={deleteLoading}
      />
    </div>
  );
}
