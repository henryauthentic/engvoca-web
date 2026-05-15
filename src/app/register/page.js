"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, BookOpen, Loader2, AlertCircle, UserPlus } from "lucide-react";
import { AuthProvider, useAuth } from "@/lib/AuthContext";

function RegisterForm() {
  const router = useRouter();
  const { register, loginWithGoogle } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) { setError("Vui lòng nhập đầy đủ thông tin."); return; }
    if (password.length < 6) { setError("Mật khẩu phải có ít nhất 6 ký tự."); return; }
    if (password !== confirmPassword) { setError("Mật khẩu xác nhận không khớp."); return; }
    setError("");
    setLoading(true);
    try {
      await register(email, password, name);
      router.push("/dashboard");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") setError("Email này đã được sử dụng.");
      else if (err.code === "auth/weak-password") setError("Mật khẩu quá yếu.");
      else if (err.code === "auth/invalid-email") setError("Email không hợp lệ.");
      else setError("Đăng ký thất bại. Vui lòng thử lại.");
    } finally { setLoading(false); }
  };

  const handleGoogleRegister = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      router.push("/dashboard");
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") setError("Đăng nhập Google thất bại.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-500 via-primary-600 to-primary-700 p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 right-20 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-primary-400/10 rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-extrabold text-white">ENG VOCA</span>
          </Link>
          <p className="text-white/60 text-sm mt-2">Tạo tài khoản để bắt đầu học</p>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Đăng ký</h2>

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </motion.div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tên hiển thị</label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
                <UserPlus className="w-4 h-4 text-gray-400" />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Minh Tuấn"
                  className="flex-1 text-sm bg-transparent outline-none text-gray-900 placeholder:text-gray-400" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Email</label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
                <Mail className="w-4 h-4 text-gray-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                  className="flex-1 text-sm bg-transparent outline-none text-gray-900 placeholder:text-gray-400" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Mật khẩu</label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
                <Lock className="w-4 h-4 text-gray-400" />
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tối thiểu 6 ký tự"
                  className="flex-1 text-sm bg-transparent outline-none text-gray-900 placeholder:text-gray-400" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Xác nhận mật khẩu</label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
                <Lock className="w-4 h-4 text-gray-400" />
                <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu"
                  className="flex-1 text-sm bg-transparent outline-none text-gray-900 placeholder:text-gray-400" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl font-semibold text-sm hover:from-primary-600 hover:to-secondary-600 transition-all cursor-pointer disabled:opacity-60 shadow-lg shadow-primary-500/25">
              {loading ? <Loader2 className="w-5 h-5 mx-auto animate-spin" /> : "Tạo tài khoản"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">hoặc</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <button onClick={handleGoogleRegister} disabled={loading}
            className="w-full py-3 border border-gray-200 rounded-xl font-medium text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Đăng ký bằng Google
          </button>

          <p className="text-center text-sm text-gray-500 mt-6">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-primary-600 font-semibold hover:text-primary-700">Đăng nhập</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <AuthProvider>
      <RegisterForm />
    </AuthProvider>
  );
}
