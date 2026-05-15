"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight, Rocket } from "lucide-react";
import PrimaryButton from "./PrimaryButton";

export default function CTASection() {
  const containerRef = useRef(null);
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

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const springConfig = { damping: 25, stiffness: 150 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), springConfig);

  return (
    <section 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="py-24 relative overflow-hidden bg-transparent perspective-[1200px]"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative rounded-[3rem] overflow-hidden bg-white/5 dark:bg-slate-900/50 backdrop-blur-2xl border border-gray-200/50 dark:border-white/10 shadow-2xl p-10 sm:p-16 text-center transform-gpu"
        >
          {/* Internal Glow Effects */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-primary-500/20 to-transparent rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-secondary-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10" style={{ transform: "translateZ(50px)" }}>
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/80 dark:bg-white/10 border border-gray-200 dark:border-white/20 mb-8 shadow-sm">
              <Rocket className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <span className="text-sm font-bold text-gray-800 dark:text-white">
                Hoàn toàn Miễn phí
              </span>
            </div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 dark:text-white mb-6 leading-[1.1] tracking-tight">
              Sẵn sàng đột phá
              <br />
              <span className="bg-gradient-to-r from-primary-500 to-purple-500 bg-clip-text text-transparent">vốn từ vựng của bạn?</span>
            </h2>

            <p className="text-lg sm:text-xl text-gray-500 dark:text-slate-400 max-w-2xl mx-auto mb-10 font-medium">
              Không còn học vẹt. Không còn mau quên. Tham gia cùng cộng đồng 10.000+ học viên thông minh ngay hôm nay.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <PrimaryButton
                size="lg"
                href="/register"
                className="w-full sm:w-auto px-8 py-4 text-lg font-bold shadow-xl shadow-primary-500/25 hover:scale-105 transition-transform"
              >
                Đăng ký miễn phí
                <ArrowRight className="w-6 h-6 ml-2" />
              </PrimaryButton>
              <PrimaryButton
                variant="ghost"
                size="lg"
                href="#demo"
                className="w-full sm:w-auto px-8 py-4 text-lg font-bold bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white hover:bg-white dark:hover:bg-white/10 shadow-sm"
              >
                Xem Demo trước
              </PrimaryButton>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
