"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Loader2,
} from "lucide-react";

/**
 * Reusable admin DataTable with sorting, pagination, search, and row selection.
 *
 * @param {Object} props
 * @param {Array} props.columns - [{ key, label, sortable?, render?, width? }]
 * @param {Array} props.data - Array of row objects
 * @param {boolean} props.loading
 * @param {number} props.pageSize - Items per page (default 20)
 * @param {boolean} props.selectable - Enable row checkboxes
 * @param {Function} props.onRowClick - (row) => void
 * @param {Function} props.onSelectionChange - (selectedIds) => void
 * @param {string} props.idKey - Row ID field name (default "id")
 * @param {string} props.emptyMessage
 * @param {string} props.emptyIcon
 * @param {React.ReactNode} props.actions - Bulk action buttons
 * @param {boolean} props.searchable - Show search input
 * @param {string} props.searchPlaceholder
 */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  pageSize = 20,
  selectable = false,
  onRowClick,
  onSelectionChange,
  idKey = "id",
  emptyMessage = "Không có dữ liệu",
  emptyIcon = "📭",
  actions,
  searchable = false,
  searchPlaceholder = "Tìm kiếm...",
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Search filter
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        if (val == null) return false;
        return String(val).toLowerCase().includes(q);
      })
    );
  }, [data, searchQuery, columns]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey] ?? "";
      const bVal = b[sortKey] ?? "";
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const pagedData = sortedData.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setCurrentPage(0);
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
    onSelectionChange?.(Array.from(next));
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pagedData.length) {
      setSelectedIds(new Set());
      onSelectionChange?.([]);
    } else {
      const allIds = new Set(pagedData.map((r) => r[idKey]));
      setSelectedIds(allIds);
      onSelectionChange?.(Array.from(allIds));
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {(searchable || actions) && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {searchable && (
              <div className="h-10 w-full sm:max-w-sm bg-gray-200 dark:bg-slate-800 rounded-xl" />
            )}
          </div>
        )}
        <div className="glass-panel overflow-hidden relative">
          <div className="hidden sm:flex gap-4 px-5 py-3 border-b border-border-color bg-surface-elevated/40">
            {columns.map((col) => (
              <div key={col.key} className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-20" style={{ width: col.width }} />
            ))}
          </div>
          <div className="divide-y divide-border-color">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 px-5 py-3.5">
                {columns.map((col, j) => (
                  <div key={j} className="h-4 bg-gray-100 dark:bg-slate-800 rounded" style={{ flex: col.width?.includes('fr') ? col.width.replace('fr', '') : 1, width: col.width?.includes('px') ? col.width : 'auto' }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Top bar: search + bulk actions */}
      {(searchable || actions) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {searchable && (
            <div className="flex items-center gap-2 bg-surface border border-border-color rounded-xl px-4 py-2.5 w-full sm:max-w-sm">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0); }}
                placeholder={searchPlaceholder}
                className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder-gray-400"
              />
            </div>
          )}
          {actions && selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">
                {selectedIds.size} đã chọn
              </span>
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="glass-panel overflow-hidden relative">
        {data.length === 0 && !searchQuery ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">{emptyIcon}</p>
            <p className="text-sm text-gray-400">{emptyMessage}</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-sm text-gray-400">Không tìm thấy kết quả cho &ldquo;{searchQuery}&rdquo;</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="hidden sm:grid gap-4 px-5 py-3 border-b border-border-color text-[11px] font-bold text-gray-500 uppercase tracking-wide bg-surface-elevated/40 backdrop-blur-md sticky top-0 z-10"
              style={{ gridTemplateColumns: `${selectable ? "40px " : ""}${columns.map(c => c.width || "1fr").join(" ")}` }}
            >
              {selectable && (
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === pagedData.length && pagedData.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 accent-primary-500 cursor-pointer"
                  />
                </div>
              )}
              {columns.map((col) => (
                <div
                  key={col.key}
                  className={`flex items-center gap-1 ${col.sortable !== false ? "cursor-pointer select-none hover:text-primary-600" : ""}`}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <span>{col.label}</span>
                  {col.sortable !== false && sortKey === col.key && (
                    sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-border-color">
              {pagedData.map((row, i) => (
                <motion.div
                  key={row[idKey] || i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3), ease: [0.4, 0, 0.2, 1] }}
                  className={`grid gap-4 px-5 py-3.5 hover:bg-gradient-to-r hover:from-blue-500/5 hover:to-purple-500/5 transition-all items-center ${onRowClick ? "cursor-pointer" : ""}`}
                  style={{ gridTemplateColumns: `${selectable ? "40px " : ""}${columns.map(c => c.width || "1fr").join(" ")}` }}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row[idKey])}
                        onChange={() => toggleSelect(row[idKey])}
                        className="w-4 h-4 rounded border-gray-300 accent-primary-500 cursor-pointer"
                      />
                    </div>
                  )}
                  {columns.map((col) => (
                    <div key={col.key} className="min-w-0">
                      {col.render ? col.render(row[col.key], row) : (
                        <span className="text-sm text-foreground truncate block">
                          {row[col.key] ?? "—"}
                        </span>
                      )}
                    </div>
                  ))}
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border-color bg-surface-elevated/40 backdrop-blur-md sticky bottom-0 z-10">
                <span className="text-xs text-gray-400">
                  Hiển thị {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, sortedData.length)} / {sortedData.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(0)}
                    disabled={currentPage === 0}
                    className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <ChevronsLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="px-3 py-1 text-xs font-semibold text-foreground">
                    {currentPage + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages - 1)}
                    disabled={currentPage >= totalPages - 1}
                    className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <ChevronsRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
