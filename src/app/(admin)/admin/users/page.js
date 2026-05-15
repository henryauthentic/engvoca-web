"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAllUsers } from "@/lib/adminService";
import DataTable from "@/components/admin/DataTable";
import { exportToCSV } from "@/lib/exportUtils";
import { motion } from "framer-motion";
import { Users, Shield, Smartphone, Globe, Download } from "lucide-react";

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const result = await getAllUsers({ pageSize: 200 });
      setUsers(result.users);
    } catch (err) {
      console.error("Failed to load users:", err);
    }
    setLoading(false);
  }

  const columns = [
    {
      key: "displayName",
      label: "User",
      width: "1.5fr",
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {(val || "U").substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{val || "Unknown"}</p>
            <p className="text-[11px] text-gray-400">{row.email || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "totalXp",
      label: "XP",
      width: "0.6fr",
      render: (val) => (
        <span className="text-sm font-mono font-bold text-foreground">
          {(val || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: "currentStreak",
      label: "Streak",
      width: "0.5fr",
      render: (val) => (
        <span className="text-sm font-mono">
          {val || 0} 🔥
        </span>
      ),
    },
    {
      key: "learnedWords",
      label: "Đã học",
      width: "0.6fr",
      render: (val) => (
        <span className="text-sm font-mono text-foreground">{(val || 0).toLocaleString()}</span>
      ),
    },
    {
      key: "lastStudyDate",
      label: "Học gần nhất",
      width: "0.8fr",
      render: (val) => (
        <span className="text-xs text-gray-500">{val || "—"}</span>
      ),
    },
    {
      key: "lastChangeSource",
      label: "Source",
      width: "0.5fr",
      render: (val) => (
        <span className={`admin-badge ${val === "web" ? "admin-badge-blue" : val === "mobile" ? "admin-badge-green" : "admin-badge-gray"}`}>
          {val === "web" ? <Globe className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
          {val || "—"}
        </span>
      ),
    },
    {
      key: "role",
      label: "Role",
      width: "0.5fr",
      render: (val) =>
        val === "admin" ? (
          <span className="admin-badge admin-badge-red">
            <Shield className="w-3 h-3" /> Admin
          </span>
        ) : (
          <span className="admin-badge admin-badge-gray">User</span>
        ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Users</h1>
          <p className="text-sm text-gray-500 mt-1">
            {users.length.toLocaleString()} người dùng trong hệ thống
          </p>
        </div>
        <button
          onClick={() => {
            const cols = [
              { key: "displayName", label: "Tên" },
              { key: "email", label: "Email" },
              { key: "totalXp", label: "XP" },
              { key: "currentStreak", label: "Streak" },
              { key: "learnedWords", label: "Đã học" },
              { key: "lastStudyDate", label: "Học gần nhất" },
              { key: "role", label: "Role" },
              { key: "lastChangeSource", label: "Source" },
            ];
            exportToCSV(users, cols, "users_export");
          }}
          className="flex items-center gap-2 px-3 py-2.5 bg-surface border border-border-color text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export CSV</span>
        </button>
      </motion.div>

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        pageSize={20}
        searchable
        searchPlaceholder="Tìm user theo tên hoặc email..."
        emptyMessage="Chưa có user nào"
        emptyIcon="👤"
        onRowClick={(row) => router.push(`/admin/users/${row.id}`)}
      />
    </div>
  );
}
