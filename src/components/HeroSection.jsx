"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion";
import { ArrowRight, Sparkles, Zap, BrainCircuit, TrendingUp, Star, Award, BookOpen } from "lucide-react";
import PrimaryButton from "./PrimaryButton";

export default function HeroSection() {
  const containerRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Mouse parallax for the entire galaxy
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  // Parallax layers with springs for smoothness
  const springConfig = { damping: 25, stiffness: 150 };
  const layer1X = useSpring(useTransform(mouseX, [-0.5, 0.5], [-30, 30]), springConfig);
  const layer1Y = useSpring(useTransform(mouseY, [-0.5, 0.5], [-30, 30]), springConfig);
  
  const layer2X = useSpring(useTransform(mouseX, [-0.5, 0.5], [-60, 60]), springConfig);
  const layer2Y = useSpring(useTransform(mouseY, [-0.5, 0.5], [-60, 60]), springConfig);
  
  const layer3X = useSpring(useTransform(mouseX, [-0.5, 0.5], [-100, 100]), springConfig);
  const layer3Y = useSpring(useTransform(mouseY, [-0.5, 0.5], [-100, 100]), springConfig);

  // 3D Rotation for cards
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [15, -15]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-15, 15]), springConfig);

  return (
    <section
      id="hero"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-[100vh] flex items-center pt-20 pb-16 bg-transparent"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* --- LEFT TEXT CONTENT --- */}
          <div className="lg:col-span-5 relative z-30">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-gray-200 dark:border-slate-700 mb-6 shadow-sm"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-primary-500 to-purple-500 flex items-center justify-center">
                <BrainCircuit className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold bg-gradient-to-r from-primary-600 to-purple-600 dark:from-primary-400 dark:to-purple-400 bg-clip-text text-transparent">
                Thế hệ học từ vựng mới
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-[4.2rem] font-extrabold leading-[1.1] tracking-tight text-gray-900 dark:text-white mb-6"
            >
              Học thông minh,<br />
              <span className="relative inline-block mt-2">
                nhớ lâu hơn
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 10C50 -2 150 -2 198 10" stroke="url(#paint0_linear)" strokeWidth="4" strokeLinecap="round"/>
                  <defs>
                    <linearGradient id="paint0_linear" x1="0" y1="4" x2="200" y2="4" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#8b5cf6" />
                      <stop offset="1" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-gray-600 dark:text-slate-400 leading-relaxed mb-8 pr-4"
            >
              Đừng học vẹt nữa. ENG VOCA phân tích trí nhớ của bạn bằng AI và lên lịch ôn tập chính xác đến từng phút bằng thuật toán SM2.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <PrimaryButton size="lg" href="/login" className="shadow-2xl shadow-primary-500/25 group overflow-hidden relative">
                <span className="relative z-10 flex items-center">
                  Bắt đầu miễn phí
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </PrimaryButton>
              <PrimaryButton
                variant="secondary"
                size="lg"
                href="#demo"
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Xem Demo
              </PrimaryButton>
            </motion.div>

            {/* Avatars */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex items-center gap-4 mt-10 pt-6 border-t border-gray-200 dark:border-slate-800"
            >
              <div className="flex -space-x-3">
                {[1,2,3,4].map((i) => (
                  <div key={i} className={`w-10 h-10 rounded-full border-2 border-white dark:border-[#0B0F19] bg-gradient-to-br from-gray-200 to-gray-300 dark:from-slate-700 dark:to-slate-600 overflow-hidden`}>
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i+10}`} alt="user" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <div className="flex text-amber-400 mb-0.5">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                </div>
                <p className="text-gray-600 dark:text-slate-400"><span className="font-bold text-gray-900 dark:text-white">10.000+</span> học viên tin dùng</p>
              </div>
            </motion.div>
          </div>

          {/* --- RIGHT 3D FLOATING GALAXY --- */}
          {mounted && (
            <div className="lg:col-span-7 relative h-[600px] w-full hidden sm:block perspective-[1200px]">
              <motion.div 
                className="w-full h-full relative"
                style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
              >
                {/* Center Core Component */}
                <motion.div 
                  style={{ x: layer1X, y: layer1Y, translateZ: 50 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 p-6 shadow-2xl shadow-primary-500/10 z-20"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Trí nhớ hoàn hảo</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">Thuật toán SM-2 dự đoán chính xác thời điểm bạn chuẩn bị quên từ vựng.</p>
                  <div className="space-y-3">
                    <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} animate={{ width: "85%" }} transition={{ duration: 1.5, delay: 0.5 }}
                        className="h-full bg-gradient-to-r from-primary-500 to-secondary-500" 
                      />
                    </div>
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-500">Memory Strength</span>
                      <span className="text-primary-600 dark:text-primary-400">85%</span>
                    </div>
                  </div>
                </motion.div>

                {/* Floating Card 1: Streak */}
                <motion.div 
                  animate={{ y: [0, -15, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  style={{ x: layer2X, y: layer2Y, translateZ: 100 }}
                  className="absolute top-[10%] right-[10%] w-48 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg rounded-2xl border border-white/50 dark:border-white/10 p-4 shadow-xl z-30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
                      <span className="text-xl">🔥</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Chuỗi ngày học</p>
                      <p className="text-lg font-black text-gray-900 dark:text-white">30 Ngày</p>
                    </div>
                  </div>
                </motion.div>

                {/* Floating Card 2: Learned Words */}
                <motion.div 
                  animate={{ y: [0, 15, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  style={{ x: layer3X, y: layer3Y, translateZ: 150 }}
                  className="absolute bottom-[20%] left-[5%] w-56 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg rounded-2xl border border-white/50 dark:border-white/10 p-5 shadow-2xl z-40"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/30">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <span className="flex items-center text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full">
                      <TrendingUp className="w-3 h-3 mr-1" /> +12
                    </span>
                  </div>
                  <p className="text-3xl font-black text-gray-900 dark:text-white mb-1">1,248</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Từ vựng đã chinh phục</p>
                </motion.div>

                {/* Floating Card 3: CEFR Level */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                  style={{ x: layer2X, y: layer2Y, translateZ: 80 }}
                  className="absolute bottom-[10%] right-[15%] w-40 bg-gradient-to-br from-primary-600 to-purple-700 rounded-2xl border border-white/20 p-4 shadow-xl shadow-primary-500/20 z-10"
                >
                  <Award className="w-6 h-6 text-white/80 mb-2" />
                  <p className="text-white/80 text-xs font-medium">Trình độ CEFR</p>
                  <p className="text-white text-2xl font-black tracking-tight">B2 Upper</p>
                </motion.div>

                {/* Decorative Small Orbs */}
                <motion.div 
                  style={{ x: layer3X, y: layer3Y, translateZ: 200 }}
                  className="absolute top-[20%] left-[20%] w-6 h-6 rounded-full bg-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.8)]"
                />
                <motion.div 
                  style={{ x: layer1X, y: layer1Y, translateZ: 20 }}
                  className="absolute bottom-[30%] right-[10%] w-4 h-4 rounded-full bg-purple-400 shadow-[0_0_15px_rgba(192,132,252,0.8)]"
                />
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
