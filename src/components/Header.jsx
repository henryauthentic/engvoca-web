"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, BookOpen, Sun, Moon } from "lucide-react";
import PrimaryButton from "./PrimaryButton";

const NAV_ITEMS = [
  { label: "Trang chủ", href: "#hero" },
  { label: "Tính năng", href: "#features" },
  { label: "Demo", href: "#demo" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Initialize theme
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setDarkMode(true);
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      setDarkMode(false);
      document.documentElement.removeAttribute("data-theme");
    }

    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-md shadow-lg shadow-gray-200/50 dark:shadow-black/20 border-b border-gray-200 dark:border-white/5 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo */}
        <a href="#hero" className="flex items-center gap-3 group">
          <div className="w-16 h-16 transition-transform group-hover:scale-105">
            <img src="/app-icon-v3.png" alt="ENG VOCA" className="w-full h-full object-cover drop-shadow-md" />
          </div>
          <span className="text-xl font-bold text-gray-900 dark:bg-gradient-to-r dark:from-white dark:to-slate-400 dark:bg-clip-text dark:text-transparent group-hover:text-primary-600 dark:group-hover:from-primary-400 dark:group-hover:to-secondary-400 transition-colors">ENG VOCA</span>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="relative px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-white transition-colors group"
            >
              {item.label}
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full group-hover:w-4/5 transition-all duration-300" />
            </a>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleDark}
            className="p-2.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-amber-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            title="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <PrimaryButton
            variant="ghost"
            size="sm"
            href="/login"
            className="text-gray-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-white dark:hover:bg-white/10"
          >
            Đăng nhập
          </PrimaryButton>
          <PrimaryButton size="sm" href="/register" className="shadow-lg shadow-primary-500/20">
            Đăng ký miễn phí
          </PrimaryButton>
        </div>

        {/* Mobile toggle */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={toggleDark}
            className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-amber-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          <button
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-800 dark:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-xl border-t border-gray-200 dark:border-white/10 overflow-hidden shadow-2xl"
          >
            <div className="px-4 py-4 space-y-1">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="block px-4 py-3 rounded-xl text-gray-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors font-medium"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <div className="pt-3 border-t border-gray-200 dark:border-white/10 space-y-2">
                <PrimaryButton
                  variant="secondary"
                  size="sm"
                  href="/login"
                  className="w-full bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  Đăng nhập
                </PrimaryButton>
                <PrimaryButton
                  size="sm"
                  href="/register"
                  className="w-full shadow-lg shadow-primary-500/20"
                >
                  Đăng ký miễn phí
                </PrimaryButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
