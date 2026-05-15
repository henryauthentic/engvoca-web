"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getSyncOverview, updateUserField } from "@/lib/adminService";
import DataTable from "@/components/admin/DataTable";
import StatCard from "@/components/admin/StatCard";
import { motion } from "framer-motion";
import { RefreshCw, Globe, Smartphone, AlertCircle, Clock } from "lucide-react";

function timeAgo(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  const now = new Date();
  const diffHrs = Math.floor((now - d) / 3600000);
  if (diffHrs < 1) return "< 1 giờ";
  if (diffHrs < 24) return `${diffHrs} giờ`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays} ngày`;
}

export default function SyncPage() {
  const { user: adminUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSync(); }, []);

  async function loadSync() {
    setLoading(true);
    try {
      const result = await getSyncOverview({ pageSize: 200 });
      setUsers(result.users);
    } catch (err) {
      console.error("Failed to load sync data:", err);
    }
    setLoading(false);
  }

  async function handleForceSync(uid) {
    if (!confirm("Bắt buộc thiết bị của user này đồng bộ lại toàn bộ dữ liệu ở lần mở app tiếp theo?")) return;
    try {
      await updateUserField(adminUser.uid, uid, "forceSyncRequested", true);
      alert("Đã gửi yêu cầu Force Sync");
      loadSync();
    } catch(err) {
      alert("Lỗi: " + err.message);
    }
  }

  // Compute stats
  const webUsers = users.filter((u) => u.lastChangeSource === "web").length;
  const mobileUsers = users.filter((u) => u.lastChangeSource === "mobile").length;
  const staleUsers = users.filter((u) => {
    if (!u.lastSyncedAt) return true;
    const diff = Date.now() - new Date(u.lastSyncedAt).getTime();
    return diff > 24 * 60 * 60 * 1000;
  }).length;
  const recentUsers = users.filter((u) => {
    if (!u.lastSyncedAt) return false;
    const diff = Date.now() - new Date(u.lastSyncedAt).getTime();
    return diff < 60 * 60 * 1000;
  }).length;

  const columns = [
    {
      key: "displayName",
      label: "User",
      width: "1.5fr",
      render: (val, row) => (
        <div>
          <p className="text-sm font-semibold text-foreground">{val}</p>
          <p className="text-[11px] text-gray-400">{row.email}</p>
        </div>
      ),
    },
    {
      key: "lastSyncedAt",
      label: "Sync gần nhất",
      width: "1fr",
      render: (val) => {
        const isStale = val && (Date.now() - new Date(val).getTime()) > 24 * 60 * 60 * 1000;
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <div className={`admin-dot ${isStale ? "admin-dot-red animate-pulse" : val ? "admin-dot-green" : "admin-dot-orange"}`} />
              <span className={`text-sm ${isStale ? "text-red-500 font-semibold" : "text-gray-600"}`}>{timeAgo(val)} trước</span>
            </div>
            {isStale && <span className="text-[10px] text-red-400 mt-0.5 uppercase tracking-wider font-bold">Stale Warning</span>}
          </div>
        );
      },
    },
    {
      key: "lastChangeSource",
      label: "Source",
      width: "0.7fr",
      render: (val) => (
        <span className={`admin-badge ${val === "web" ? "admin-badge-blue" : val === "mobile" ? "admin-badge-green" : "admin-badge-gray"}`}>
          {val === "web" ? <Globe className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
          {val || "unknown"}
        </span>
      ),
    },
    {
      key: "learnedWords",
      label: "Đã học",
      width: "0.5fr",
      render: (val) => <span className="text-sm font-mono">{val || 0}</span>,
    },
    {
      key: "totalXp",
      label: "XP",
      width: "0.5fr",
      render: (val) => <span className="text-sm font-mono">{(val || 0).toLocaleString()}</span>,
    },
    {
      key: "actions",
      label: "",
      width: "120px",
      render: (_, row) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleForceSync(row.id); }}
          className="px-2 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
          title="Bắt buộc đồng bộ lại toàn bộ"
        >
          Force Sync
        </button>
      )
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Sync Monitor</h1>
        <p className="text-sm text-gray-500 mt-1">
          Theo dõi trạng thái đồng bộ giữa Web và Mobile
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Sync gần đây (1h)" value={recentUsers} icon={Clock} color="green" delay={0} />
        <StatCard label="Web source" value={webUsers} icon={Globe} color="blue" delay={0.05} />
        <StatCard label="Mobile source" value={mobileUsers} icon={Smartphone} color="green" delay={0.1} />
        <StatCard label="Stale (>24h)" value={staleUsers} icon={AlertCircle} color="red" delay={0.15} />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        pageSize={20}
        searchable
        searchPlaceholder="Tìm user..."
        emptyMessage="Chưa có dữ liệu sync"
        emptyIcon="🔄"
      />
    </div>
  );
}
