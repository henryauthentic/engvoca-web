"use client";

import { motion } from "framer-motion";
import { BookOpen, Mail, Heart } from "lucide-react";

function GithubIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

const FOOTER_LINKS = [
  {
    title: "Sản phẩm",
    links: [
      { label: "Tính năng", href: "#features" },
      { label: "Demo", href: "#demo" },
      { label: "Bắt đầu học", href: "/login" },
    ],
  },
  {
    title: "Tài nguyên",
    links: [
      { label: "Hướng dẫn", href: "#" },
      { label: "Blog", href: "#" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Liên hệ",
    links: [
      { label: "Email", href: "mailto:contact@engvoca.com" },
      { label: "GitHub", href: "https://github.com" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-[#0B0F19] text-gray-600 dark:text-slate-300 pt-20 pb-8 border-t border-gray-200 dark:border-white/5 relative overflow-hidden">
      {/* Decorative Blur */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-primary-500/5 dark:bg-primary-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a href="#hero" className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">ENG VOCA</span>
            </a>
            <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed mb-6 font-medium">
              Ứng dụng học từ vựng thông minh sử dụng AI & thuật toán Spaced Repetition (SM2).
            </p>
            <div className="flex gap-3">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center hover:bg-primary-500 hover:text-white dark:hover:bg-primary-500 transition-all text-gray-600 dark:text-slate-400">
                <GithubIcon className="w-5 h-5" />
              </a>
              <a href="mailto:contact@engvoca.com" className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center hover:bg-primary-500 hover:text-white dark:hover:bg-primary-500 transition-all text-gray-600 dark:text-slate-400">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Link Columns */}
          {FOOTER_LINKS.map((col) => (
            <div key={col.title}>
              <h4 className="text-gray-900 dark:text-white font-bold text-base mb-6">
                {col.title}
              </h4>
              <ul className="space-y-4">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors relative group">
                      {link.label}
                      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary-500 dark:bg-primary-400 group-hover:w-full transition-all duration-300" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 dark:via-slate-800 to-transparent mb-8" />

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm font-medium text-gray-400 dark:text-slate-500">
          <p>© 2026 ENG VOCA. Đồ án tốt nghiệp.</p>
          <p className="flex items-center gap-1.5">
            Phát triển với <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse" />{" "}
            bằng Next.js & Flutter
          </p>
        </div>
      </div>
    </footer>
  );
}
