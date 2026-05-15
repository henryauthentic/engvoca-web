"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getTopicsAdmin, createTopic, updateTopic, deleteTopic } from "@/lib/adminService";
import TopicFormModal from "@/components/admin/TopicFormModal";
import { motion } from "framer-motion";
import { Plus, Pencil, FolderTree, ChevronRight, Hash, Filter, ArrowUp, ArrowDown, Search, Trash2 } from "lucide-react";

export default function TopicsPage() {
  const { user } = useAuth();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [initialParentId, setInitialParentId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTopics, setExpandedTopics] = useState({});

  useEffect(() => { loadTopics(); }, []);

  async function loadTopics() {
    setLoading(true);
    try {
      const data = await getTopicsAdmin();
      setTopics(data);
    } catch (err) {
      console.error("Failed to load topics:", err);
    }
    setLoading(false);
  }

  async function handleSubmit(formData) {
    setFormLoading(true);
    try {
      if (editingTopic) {
        await updateTopic(user.uid, editingTopic.id, formData);
      } else {
        await createTopic(user.uid, formData);
      }
      setFormOpen(false);
      setEditingTopic(null);
      await loadTopics();
    } catch (err) {
      console.error("Failed to save topic:", err);
      alert("Lỗi: " + err.message);
    }
    setFormLoading(false);
  }

  async function handleDeleteTopic(topic, e) {
    e.stopPropagation();
    const children = childrenMap[topic.id] || [];
    if (children.length > 0) {
      alert("Không thể xoá chủ đề đang có chủ đề con. Vui lòng xoá chủ đề con trước.");
      return;
    }
    if (topic.total_words > 0) {
      alert("Không thể xoá chủ đề đang chứa từ vựng. Vui lòng di chuyển hoặc xoá các từ vựng bên trong trước.");
      return;
    }
    
    if (!confirm(`Bạn có chắc chắn muốn xoá chủ đề "${topic.name}"? Hành động này không thể hoàn tác.`)) {
      return;
    }

    try {
      await deleteTopic(user.uid, topic.id, topic.name);
      await loadTopics();
    } catch (err) {
      console.error("Failed to delete topic:", err);
      alert("Lỗi khi xoá: " + err.message);
    }
  }

  // Quick Re-order
  async function handleSwapOrder(e, topic, direction) {
    e.stopPropagation();
    const siblings = topics.filter(t => t.parent_id === topic.parent_id).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    const currentIndex = siblings.findIndex(t => t.id === topic.id);
    if (currentIndex === -1) return;
    
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;
    
    const targetTopic = siblings[targetIndex];
    let newCurrentOrder = targetTopic.order_index || 0;
    let newTargetOrder = topic.order_index || 0;
    
    if (newCurrentOrder === newTargetOrder) {
      newCurrentOrder += direction;
    }

    // Optimistic UI update
    setTopics(prev => prev.map(t => {
      if (t.id === topic.id) return { ...t, order_index: newCurrentOrder };
      if (t.id === targetTopic.id) return { ...t, order_index: newTargetOrder };
      return t;
    }));

    try {
      await updateTopic(user.uid, topic.id, { order_index: newCurrentOrder });
      await updateTopic(user.uid, targetTopic.id, { order_index: newTargetOrder });
    } catch (err) {
      console.error(err);
      loadTopics();
    }
  }

  // Group topics: parents with their children
  const allParents = topics.filter((t) => !t.parent_id).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  const childrenMap = {};
  topics.filter((t) => t.parent_id).forEach((t) => {
    if (!childrenMap[t.parent_id]) childrenMap[t.parent_id] = [];
    childrenMap[t.parent_id].push(t);
  });
  
  Object.keys(childrenMap).forEach(k => {
    childrenMap[k].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  });

  const parentTopics = allParents.filter((parent) => {
    const matchStatus = statusFilter ? (parent.status || "published") === statusFilter : true;
    const children = childrenMap[parent.id] || [];
    const searchLower = searchQuery.toLowerCase();
    const matchSearch = searchQuery 
      ? parent.name.toLowerCase().includes(searchLower) || children.some(c => c.name.toLowerCase().includes(searchLower))
      : true;
    return matchStatus && matchSearch;
  });

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Chủ đề</h1>
          <p className="text-sm text-gray-500 mt-1">
            {parentTopics.length} chủ đề gốc • {topics.length} tổng cộng
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm chủ đề..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-surface border border-border-color rounded-xl text-sm outline-none w-48 focus:border-primary-400 transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-surface border border-border-color rounded-xl text-sm outline-none cursor-pointer"
          >
            <option value="">Tất cả status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <button
            onClick={() => { setEditingTopic(null); setInitialParentId(null); setFormOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tạo chủ đề
          </button>
        </div>
      </motion.div>

      {/* Topic Tree */}
      <div className="space-y-3">
        {parentTopics.map((parent, pi) => {
          const children = childrenMap[parent.id] || [];
          return (
            <motion.div
              key={parent.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: pi * 0.05 }}
              className="portal-card overflow-hidden"
            >
              {/* Parent row */}
              <div 
                className={`flex items-center gap-4 px-6 py-4 transition-colors ${children.length > 0 ? 'cursor-pointer hover:bg-gray-50/80' : 'hover:bg-gray-50/50'}`}
                onClick={() => {
                  if (children.length > 0) {
                    setExpandedTopics(prev => ({ ...prev, [parent.id]: !prev[parent.id] }));
                  }
                }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: (parent.color_hex || "#3b82f6") + "15" }}
                >
                  {parent.icon_url || "📚"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">{parent.name}</h3>
                    <span className="admin-badge admin-badge-gray opacity-50 group-hover:opacity-100 transition-opacity">
                      <Hash className="w-3 h-3" />
                      {parent.order_index || 0}
                    </span>
                    {(parent.status || "published") === "draft" && (
                      <span className="admin-badge" style={{ background: "#f3f4f6", color: "#6b7280", fontSize: "10px" }}>Draft</span>
                    )}
                    {(parent.status || "published") === "archived" && (
                      <span className="admin-badge" style={{ background: "#fff7ed", color: "#ea580c", fontSize: "10px" }}>Archived</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {parent.description || "Không có mô tả"}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] text-gray-400">
                      {parent.total_words || 0} từ
                    </span>
                    {children.length > 0 && (
                      <span className="text-[11px] text-gray-400">
                        {children.length} chủ đề con
                      </span>
                    )}
                  </div>
                </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex flex-col mr-2">
                      <button onClick={(e) => handleSwapOrder(e, parent, -1)} className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30" disabled={pi === 0}>
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button onClick={(e) => handleSwapOrder(e, parent, 1)} className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30" disabled={pi === parentTopics.length - 1}>
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setInitialParentId(parent.id); setEditingTopic(null); setFormOpen(true); }}
                      className="p-2 rounded-lg hover:bg-green-50 text-green-500 transition-colors cursor-pointer"
                      title="Thêm chủ đề con"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingTopic(parent); setFormOpen(true); }}
                      className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors cursor-pointer"
                      title="Sửa chủ đề"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteTopic(parent, e)}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors cursor-pointer"
                      title="Xoá chủ đề"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {children.length > 0 && (
                      <div className={`p-1.5 rounded-lg text-gray-400 transition-transform ${expandedTopics[parent.id] ? 'rotate-90' : ''}`}>
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    )}
                  </div>
              </div>

              {/* Children */}
              {children.length > 0 && expandedTopics[parent.id] && (
                <div className="border-t border-border-color bg-gray-50/30">
                  {children.map((child, ci) => (
                    <div
                      key={child.id}
                      className="flex items-center gap-4 px-6 py-3 hover:bg-gray-100/50 transition-colors border-b border-border-color last:border-0"
                    >
                      <div className="w-6 flex items-center justify-center">
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ background: (child.color_hex || parent.color_hex || "#3b82f6") + "15" }}
                      >
                        {child.icon_url || parent.icon_url || "📖"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{child.name}</p>
                        <p className="text-[11px] text-gray-400">
                          {child.total_words || 0} từ
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex flex-col mr-2">
                          <button onClick={(e) => handleSwapOrder(e, child, -1)} className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30" disabled={ci === 0}>
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button onClick={(e) => handleSwapOrder(e, child, 1)} className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30" disabled={ci === children.length - 1}>
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => { setEditingTopic(child); setFormOpen(true); }}
                          className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteTopic(child, e)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors cursor-pointer"
                          title="Xoá chủ đề"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {parentTopics.length === 0 && (
        <div className="text-center py-16">
          <FolderTree className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Chưa có chủ đề nào</p>
        </div>
      )}

      <TopicFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingTopic(null); setInitialParentId(null); }}
        onSubmit={handleSubmit}
        initialData={editingTopic}
        parentTopics={parentTopics}
        loading={formLoading}
        initialParentId={initialParentId}
      />
    </div>
  );
}
