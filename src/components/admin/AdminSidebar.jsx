"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { hasPermission, NAV_PERMISSIONS, ROLE_LABELS, ROLE_COLORS } from "@/lib/permissions";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  FolderTree,
  Users,
  RefreshCw,
  ChevronLeft,
  Sun,
  Moon,
  LogOut,
  X,
  Shield,
  ClipboardList,
  Settings,
  MessageSquare,
  Megaphone,
  ToggleLeft,
} from "lucide-react";
import { useState, useEffect } from "react";

const NAV_SECTIONS = [
  {
    title: "Tổng quan",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, permission: "dashboard.view" },
    ],
  },
  {
    title: "Quản lý Nội dung",
    items: [
      { href: "/admin/vocabulary", label: "Từ vựng", icon: BookOpen, permission: "vocabulary.view" },
      { href: "/admin/topics", label: "Chủ đề", icon: FolderTree, permission: "topics.view" },
    ],
  },
  {
    title: "Người dùng & Hệ thống",
    items: [
      { href: "/admin/users", label: "Users", icon: Users, permission: "users.view" },
      { href: "/admin/sync", label: "Sync", icon: RefreshCw, permission: "sync.view" },
      { href: "/admin/logs", label: "Audit Log", icon: ClipboardList, permission: "logs.view" },
    ],
  },
  {
    title: "Tương tác",
    items: [
      { href: "/admin/feedback", label: "Feedback", icon: MessageSquare, permission: "feedback.view" },
      { href: "/admin/announcements", label: "Thông báo", icon: Megaphone, permission: "announcements.view" },
    ],
  },
  {
    title: "Cấu hình",
    items: [
      { href: "/admin/flags", label: "Feature Flags", icon: ToggleLeft, permission: "flags.view" },
      { href: "/admin/settings", label: "Cài đặt", icon: Settings, permission: "settings.view" },
    ],
  },
];

export default function AdminSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const pathname = usePathname();
  const { user, userData, userRole, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setDarkMode(true);
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  // Filter nav sections based on user permissions
  const filteredSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => hasPermission(userRole, item.permission)),
  })).filter((section) => section.items.length > 0);

  const roleColor = ROLE_COLORS[userRole] || ROLE_COLORS.user;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-surface-elevated/50 backdrop-blur-md">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-[80px] flex-shrink-0">
        <motion.div
          whileHover={{ rotate: -5, scale: 1.05 }}
          className="w-16 h-16 flex-shrink-0"
        >
          <img src="/app-icon-v3.png" alt="ENG VOCA" className="w-full h-full object-cover drop-shadow-md" />
        </motion.div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            <span className="text-lg font-bold tracking-tight text-foreground leading-none">
              ENG <span className="text-purple-500">VOCA</span>
            </span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-1">
              Management Console
            </span>
          </motion.div>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-6 pb-4">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${roleColor.bg} ${roleColor.text} border ${roleColor.border}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${roleColor.dot}`} />
            {ROLE_LABELS[userRole] || "User"}
          </div>
        </div>
      )}

      {/* Nav items grouped by section */}
      <nav className="flex-1 px-4 py-2 overflow-y-auto space-y-4">
        {filteredSections.map((section, si) => (
          <div key={si}>
            {!collapsed && (
              <p className="px-4 mb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    className={`admin-sidebar-link group flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium ${
                      isActive
                        ? "admin-sidebar-active"
                        : "text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon
                      className={`sidebar-icon w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
                        isActive ? "" : "group-hover:scale-110"
                      }`}
                    />
                    {!collapsed && (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {item.label}
                      </motion.span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-6 border-t border-gray-100 space-y-1">
        {/* Back to portal */}
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-primary-600 transition-all duration-200"
          title={collapsed ? "Portal" : undefined}
        >
          <BookOpen className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Về Portal</span>}
        </Link>

        {/* Theme toggle */}
        <button
          onClick={toggleDark}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-primary-600 transition-all duration-200"
          title={collapsed ? "Đổi theme" : undefined}
        >
          {darkMode ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
          {!collapsed && <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>}
        </button>

        {/* Collapse */}
        {onToggle && (
          <button
            onClick={onToggle}
            className="w-full hidden lg:flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-100 hover:text-primary-600 transition-all duration-200"
          >
            <ChevronLeft className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} />
            {!collapsed && <span>Thu gọn</span>}
          </button>
        )}

        {/* Logout */}
        <button
          onClick={async () => { await logout(); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
          title={collapsed ? "Đăng xuất" : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Đăng xuất</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col fixed top-0 left-0 h-full bg-surface-elevated border-r border-border-color z-40 sidebar-transition"
        style={{ width: collapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-width)" }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="fixed top-0 left-0 h-full bg-surface-elevated border-r border-border-color z-50 lg:hidden"
              style={{ width: "var(--sidebar-width)" }}
            >
              <button
                onClick={onMobileClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
