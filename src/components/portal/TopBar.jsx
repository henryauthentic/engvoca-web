"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Bell, Menu, X, Loader2, ChevronDown, Crown, User, Settings, Moon, HelpCircle, LogOut } from "lucide-react";
import { searchWords } from "@/data/mockWords";
import { useAuth } from "@/lib/AuthContext";
import UserSettingsModal from "./UserSettingsModal";

export default function TopBar({ onMenuToggle }) {
  const router = useRouter();
  const { user, userData, logout } = useAuth();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [settingsModal, setSettingsModal] = useState({ isOpen: false, tab: "profile" });
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") setDarkMode(true);
  }, []);

  const displayName = userData?.displayName || user?.displayName || user?.email?.split("@")[0] || "U";
  const avatarInitials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const hasValidAvatar = userData?.avatar && !userData.avatar.includes("default_avatar");

  const handleSearch = useCallback(
    (value) => {
      setQuery(value);
      if (value.trim().length >= 2) {
        const found = searchWords(value);
        setResults(found.slice(0, 5));
      } else {
        setResults([]);
      }
    },
    []
  );

  const handleSelect = (word) => {
    setQuery("");
    setResults([]);
    setFocused(false);
    router.push(`/dictionary?q=${encodeURIComponent(word.word.toLowerCase())}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && query.trim()) {
      setResults([]);
      setFocused(false);
      router.push(`/dictionary?q=${encodeURIComponent(query.trim().toLowerCase())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-surface-elevated/70 backdrop-blur-md border-b border-gray-100 dark:border-slate-800"
      style={{ height: "var(--topbar-height)" }}
    >
      <div className="flex items-center justify-between h-full px-6 lg:px-10 gap-6">
        {/* Mobile menu button */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden w-11 h-11 rounded-2xl flex items-center justify-center bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-xl relative hidden md:block">
          <div
            className={`flex items-center gap-3 rounded-2xl border px-5 py-2.5 transition-all duration-300 glow-focus ${
              focused
                ? "border-primary-400 bg-white dark:bg-slate-900 shadow-xl shadow-primary-500/10"
                : "border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 hover:border-gray-300"
            }`}
          >
            <Search className={`w-4 h-4 transition-colors ${focused ? "text-primary-500" : "text-gray-400"}`} />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 200)}
              onKeyDown={handleKeyDown}
              placeholder="Tìm kiếm từ vựng... (⌘K)"
              className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-gray-400 font-medium"
            />
            {query && (
              <button onClick={() => { setQuery(""); setResults([]); }} className="text-gray-300 hover:text-gray-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Autocomplete dropdown */}
          <AnimatePresence>
            {focused && results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 p-2"
              >
                {results.map((word) => (
                  <button
                    key={word.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(word)}
                    className="w-full flex items-center gap-4 px-4 py-3 text-left rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-secondary-100 dark:from-primary-900/30 dark:to-secondary-900/30 flex items-center justify-center text-sm font-bold text-primary-600 flex-shrink-0 group-hover:scale-110 transition-transform">
                      {word.word[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate group-hover:text-primary-600 transition-colors">{word.word}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{word.meanings[0]}</p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-lg flex-shrink-0">
                      {word.pos}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Actions Section */}
        <div className="flex items-center gap-4">
          {/* Notifications Bell */}
          <button className="relative group w-11 h-11 rounded-2xl flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
            <Bell className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
            <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm" />
          </button>

          <div className="w-px h-6 bg-gray-100 dark:bg-slate-800 hidden sm:block" />

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu((p) => !p)}
              className="flex items-center gap-3 p-1 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
            >
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold text-gray-700 dark:text-slate-300 leading-tight">
                  {displayName}
                </span>
                <span className="text-[10px] font-bold text-primary-500 uppercase tracking-widest mt-0.5">Premium</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 p-[2px] shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform">
                <div className="w-full h-full rounded-[9px] bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden">
                  {hasValidAvatar ? (
                    <img src={userData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold gradient-text">{avatarInitials}</span>
                  )}
                </div>
              </div>
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden"
                  >
                    {/* Header: User Info */}
                    <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-slate-800">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {hasValidAvatar ? (
                          <img src={userData.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          avatarInitials
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{displayName}</p>
                        <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
                      </div>
                    </div>

                    {/* Links */}
                    <div className="p-2 space-y-1">
                      <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl transition-colors">
                        <Crown className="w-4 h-4" /> Nâng cấp PRO
                      </button>
                      <button 
                        onClick={() => { setShowUserMenu(false); setSettingsModal({ isOpen: true, tab: "profile" }); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-foreground hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                      >
                        <User className="w-4 h-4" /> Thông tin cá nhân
                      </button>
                      <button 
                        onClick={() => { setShowUserMenu(false); setSettingsModal({ isOpen: true, tab: "settings" }); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-foreground hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                      >
                        <Settings className="w-4 h-4" /> Cài đặt
                      </button>
                      <button 
                        onClick={() => {
                          const next = !darkMode;
                          setDarkMode(next);
                          document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
                          localStorage.setItem("theme", next ? "dark" : "light");
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-foreground hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Moon className="w-4 h-4" /> Chế độ tối
                        </div>
                        <div className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${darkMode ? "bg-primary-500" : "bg-gray-200 dark:bg-slate-700"}`}>
                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${darkMode ? "translate-x-3.5" : "translate-x-0.5"}`} />
                        </div>
                      </button>
                    </div>

                    <div className="p-2 border-t border-gray-100 dark:border-slate-800 space-y-1">
                      <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-foreground hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <HelpCircle className="w-4 h-4" /> Trợ giúp
                      </button>
                      <button 
                        onClick={() => { setShowUserMenu(false); logout(); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                      >
                        <LogOut className="w-4 h-4" /> Đăng xuất
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <UserSettingsModal 
        isOpen={settingsModal.isOpen} 
        onClose={() => setSettingsModal({ ...settingsModal, isOpen: false })} 
        initialTab={settingsModal.tab} 
      />
    </header>
  );
}
