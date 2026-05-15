"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { Menu, Search, Bell } from "lucide-react";
import { useState } from "react";

const BREADCRUMB_MAP = {
  "/admin": "Dashboard",
  "/admin/vocabulary": "Từ vựng",
  "/admin/topics": "Chủ đề",
  "/admin/users": "Users",
  "/admin/sync": "Sync",
};

export default function AdminTopBar({ onMenuToggle }) {
  const pathname = usePathname();
  const { user, userData } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  // Build breadcrumbs
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.map((_, i) => {
    const path = "/" + segments.slice(0, i + 1).join("/");
    return {
      path,
      label: BREADCRUMB_MAP[path] || segments[i],
    };
  });

  const displayName = userData?.displayName || user?.displayName || "Admin";

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border-color">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8">
        {/* Left: hamburger + breadcrumbs */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuToggle}
            className="lg:hidden w-9 h-9 rounded-xl bg-surface flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          {/* Breadcrumbs */}
          <nav className="hidden sm:flex items-center gap-1.5 text-sm">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.path} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-gray-300">/</span>}
                <span
                  className={
                    i === breadcrumbs.length - 1
                      ? "font-semibold text-foreground"
                      : "text-gray-400"
                  }
                >
                  {crumb.label}
                </span>
              </span>
            ))}
          </nav>
        </div>

        {/* Right: search + profile */}
        <div className="flex items-center gap-3">
          {/* Search trigger */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer"
            title="Tìm kiếm (⌘K)"
          >
            <Search className="w-4 h-4 text-gray-500" />
          </button>

          {/* Notifications placeholder */}
          <button className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer relative">
            <Bell className="w-4 h-4 text-gray-500" />
          </button>

          {/* Admin avatar */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-border-color">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
              {displayName.substring(0, 2).toUpperCase()}
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-semibold text-foreground leading-none">{displayName}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Admin</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
