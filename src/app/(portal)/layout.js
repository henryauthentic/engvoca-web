"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import Sidebar from "@/components/portal/Sidebar";
import TopBar from "@/components/portal/TopBar";
import { Loader2 } from "lucide-react";

function PortalGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Not logged in → wait for redirect
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Đang chuyển hướng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div
        className="transition-all duration-300 min-h-screen flex flex-col"
        style={{
          marginLeft: `var(--sidebar-margin, 0px)`,
        }}
      >
        <style>{`
          @media (min-width: 1024px) {
            :root {
              --sidebar-margin: ${collapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-width)"};
            }
          }
        `}</style>
        <TopBar onMenuToggle={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 lg:p-8 animate-slide-in-up">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function PortalLayout({ children }) {
  return (
    <AuthProvider>
      <PortalGuard>{children}</PortalGuard>
    </AuthProvider>
  );
}
