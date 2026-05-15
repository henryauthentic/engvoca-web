"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  Library,
  Newspaper,
  Headphones,
  CreditCard,
  PenTool,
  User,
  ChevronLeft,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vocabulary", label: "Từ vựng", icon: Library },
  { href: "/dictionary", label: "Từ điển", icon: BookOpen },
  { href: "/reading", label: "Bài đọc", icon: Newspaper },
  { href: "/listen", label: "Nghe", icon: Headphones },
  { href: "/flashcards", label: "Flashcard", icon: CreditCard },
  { href: "/practice", label: "Luyện tập", icon: PenTool },
];

const BOTTOM_ITEMS = [
  { href: "/profile", label: "Hồ sơ", icon: User },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
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

  const sidebarContent = (
    <div className="flex flex-col h-full bg-surface-elevated/50 backdrop-blur-md">
      {/* Logo Section */}
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
              ENG <span className="text-primary-600">VOCA</span>
            </span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-1">AI Powered</span>
          </motion.div>
        )}
      </div>

      {/* Navigation items */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? "bg-gradient-to-r from-primary-600 to-secondary-500 text-white shadow-md shadow-primary-500/25" 
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-primary-600"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${isActive ? "" : "group-hover:scale-110"}`} />
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {item.label}
                </motion.span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Section */}
      <div className="px-4 py-6 border-t border-gray-100 dark:border-slate-800 space-y-1.5">
        {BOTTOM_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600" 
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-primary-600"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Theme Toggle */}
        <button 
          onClick={toggleDark} 
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-primary-600 transition-all duration-200"
          title={collapsed ? "Đổi theme" : undefined}
        >
          {darkMode ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
          {!collapsed && <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>}
        </button>

        {/* Collapse toggle (Desktop) */}
        {onToggle && (
          <button 
            onClick={onToggle} 
            className="w-full hidden lg:flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-primary-600 transition-all duration-200"
            title={collapsed ? "Mở rộng" : "Thu gọn"}
          >
            <ChevronLeft className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} />
            {!collapsed && <span>Thu gọn</span>}
          </button>
        )}

        {/* Logout */}
        <button
          onClick={async () => { await logout(); router.push("/login"); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 transition-all duration-200"
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
