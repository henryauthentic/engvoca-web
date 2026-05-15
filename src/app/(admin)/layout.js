"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopBar from "@/components/admin/AdminTopBar";
import { Loader2, ShieldX } from "lucide-react";

function AdminGuard({ children }) {
  const { user, userData, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Đang xác thực...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center mx-auto mb-4">
            <ShieldX className="w-8 h-8 text-error" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Truy cập bị từ chối</h1>
          <p className="text-sm text-gray-500 mb-6">
            Bạn không có quyền truy cập Admin Dashboard. Liên hệ quản trị viên nếu bạn cần quyền.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors cursor-pointer"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-gradient-mesh">
      <AdminSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div
        className="transition-all duration-300 min-h-screen flex flex-col"
        style={{ marginLeft: `var(--admin-sidebar-margin, 0px)` }}
      >
        <style>{`
          @media (min-width: 1024px) {
            :root {
              --admin-sidebar-margin: ${collapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-width)"};
            }
          }
        `}</style>
        <AdminTopBar onMenuToggle={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 lg:p-8 animate-slide-in-up">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }) {
  return (
    <AuthProvider>
      <AdminGuard>{children}</AdminGuard>
    </AuthProvider>
  );
}
