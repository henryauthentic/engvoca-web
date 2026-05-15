"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getAuditLogs } from "@/lib/adminService";
import {
  Plus,
  Pencil,
  Trash2,
  UserCog,
  FolderPlus,
  Upload,
  RotateCcw,
  RefreshCw,
  Activity,
  Loader2,
} from "lucide-react";

const ACTION_MAP = {
  CREATE_WORD: { icon: Plus, label: "Tạo từ mới", color: "text-emerald-500", bg: "bg-emerald-50" },
  UPDATE_WORD: { icon: Pencil, label: "Sửa từ", color: "text-blue-500", bg: "bg-blue-50" },
  SOFT_DELETE_WORD: { icon: Trash2, label: "Xoá từ", color: "text-red-500", bg: "bg-red-50" },
  RESTORE_WORD: { icon: RotateCcw, label: "Khôi phục từ", color: "text-emerald-500", bg: "bg-emerald-50" },
  CREATE_TOPIC: { icon: FolderPlus, label: "Tạo chủ đề", color: "text-purple-500", bg: "bg-purple-50" },
  UPDATE_TOPIC: { icon: Pencil, label: "Sửa chủ đề", color: "text-blue-500", bg: "bg-blue-50" },
  REORDER_TOPICS: { icon: RefreshCw, label: "Sắp xếp lại chủ đề", color: "text-orange-500", bg: "bg-orange-50" },
  UPDATE_USER: { icon: UserCog, label: "Cập nhật user", color: "text-orange-500", bg: "bg-orange-50" },
  BATCH_IMPORT: { icon: Upload, label: "Import hàng loạt", color: "text-purple-500", bg: "bg-purple-50" },
};

function formatTimestamp(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHr < 24) return `${diffHr} giờ trước`;

  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDetailText(action, details) {
  if (!details) return "";
  switch (action) {
    case "CREATE_WORD":
    case "SOFT_DELETE_WORD":
    case "RESTORE_WORD":
      return details.word ? `"${details.word}"` : "";
    case "UPDATE_WORD":
      return details.word
        ? `"${details.word}" (${details.changedFields?.join(", ") || ""})`
        : "";
    case "CREATE_TOPIC":
      return details.name ? `"${details.name}"` : "";
    case "UPDATE_TOPIC":
      return details.changedFields?.join(", ") || "";
    case "UPDATE_USER":
      return `${details.field}: ${details.before} → ${details.after}`;
    case "BATCH_IMPORT":
      return `${details.imported} từ đã import, ${details.errors || 0} lỗi`;
    default:
      return JSON.stringify(details).slice(0, 80);
  }
}

export default function AuditLogViewer({ maxItems = 10 }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [maxItems]);

  async function loadLogs() {
    setLoading(true);
    try {
      const data = await getAuditLogs(maxItems);
      setLogs(data);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">Chưa có hoạt động nào</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-2 pl-4 before:absolute before:inset-y-2 before:left-[27px] before:w-[2px] before:bg-gradient-to-b before:from-blue-500/20 before:to-transparent">
      {logs.map((log, i) => {
        const config = ACTION_MAP[log.action] || {
          icon: Activity,
          label: log.action,
          color: "text-gray-500",
          bg: "bg-gray-50",
        };
        const Icon = config.icon;
        const detail = getDetailText(log.action, log.details);

        return (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, ease: [0.4, 0, 0.2, 1] }}
            className="relative flex items-start gap-4 py-3 px-4 rounded-xl hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors z-10"
          >
            <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm ring-4 ring-surface-elevated`}>
              <Icon className={`w-4 h-4 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-sm font-semibold text-foreground">
                  {config.label}
                </span>
                {detail && (
                  <span className="text-xs text-gray-500 truncate">
                    {detail}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-1 font-medium">
                {formatTimestamp(log.timestamp)}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
