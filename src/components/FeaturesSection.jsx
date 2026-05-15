"use client";

import { motion } from "framer-motion";
import {
  BrainCircuit,
  Repeat,
  BarChart3,
  Gamepad2,
  BookOpenCheck,
  Zap,
} from "lucide-react";
import AppCard from "./AppCard";

const FEATURES = [
  {
    icon: BrainCircuit,
    title: "AI Thông Minh dự đoán điểm quên",
    desc: "Trí tuệ nhân tạo hỗ trợ tạo ví dụ, giải thích ngữ cảnh và sinh câu hỏi luyện tập tự động theo năng lực của riêng bạn.",
    gradient: "from-blue-500 to-cyan-500",
    glow: "shadow-cyan-500/50",
    colSpan: "md:col-span-8",
  },
  {
    icon: Repeat,
    title: "Spaced Repetition (SM2)",
    desc: "Thuật toán SM2 tính toán thời điểm ôn tập tối ưu giúp ghi nhớ sâu 300%.",
    gradient: "from-violet-500 to-purple-500",
    glow: "shadow-purple-500/50",
    colSpan: "md:col-span-4",
  },
  {
    icon: Gamepad2,
    title: "Game Hóa Học Tập",
    desc: "Hệ thống Level, XP, Streak, huy hiệu và bảng xếp hạng khiến việc học trở nên gây nghiện.",
    gradient: "from-amber-500 to-orange-500",
    glow: "shadow-orange-500/50",
    colSpan: "md:col-span-4",
  },
  {
    icon: BarChart3,
    title: "Phân Tích Heatmap",
    desc: "Biểu đồ thống kê chi tiết tiến trình học, độ chính xác và chuỗi Streak của bạn.",
    gradient: "from-emerald-500 to-teal-500",
    glow: "shadow-teal-500/50",
    colSpan: "md:col-span-4",
  },
  {
    icon: Zap,
    title: "Đồng Bộ Cloud",
    desc: "Mọi thiết bị đều được đồng bộ ngay lập tức qua hệ thống lõi Firebase.",
    gradient: "from-indigo-500 to-blue-500",
    glow: "shadow-blue-500/50",
    colSpan: "md:col-span-4",
  },
  {
    icon: BookOpenCheck,
    title: "Hàng ngàn từ vựng có sẵn",
    desc: "Khám phá hàng ngàn bộ Flashcard, bài đọc, và trắc nghiệm được phân loại theo trình độ CEFR từ A1 đến C2.",
    gradient: "from-pink-500 to-rose-500",
    glow: "shadow-pink-500/50",
    colSpan: "md:col-span-12",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 relative overflow-hidden bg-transparent">
      {/* Background Decorative Blur */}
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-primary-500/10 dark:bg-primary-500/5 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="inline-block px-5 py-2 rounded-full bg-white/50 dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 text-primary-600 dark:text-primary-400 text-sm font-bold mb-6 tracking-wide shadow-sm">
            TÍNH NĂNG NỔI BẬT
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white mb-6 tracking-tight">
            Vũ khí tối thượng để{" "}
            <span className="bg-gradient-to-r from-primary-500 to-purple-500 bg-clip-text text-transparent block sm:inline mt-2 sm:mt-0">chinh phục từ vựng</span>
          </h2>
          <p className="text-xl text-gray-500 dark:text-slate-400 max-w-3xl mx-auto font-medium">
            Sự kết hợp hoàn hảo giữa công nghệ AI tiên tiến và phương pháp khoa học chuẩn quốc tế.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {FEATURES.map((feature, index) => (
            <AppCard 
              key={feature.title} 
              delay={index * 0.1} 
              className={`group flex flex-col ${feature.colSpan}`}
            >
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-xl ${feature.glow} group-hover:scale-110 transition-transform duration-500 relative`}>
                    <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <feature.icon className="w-7 h-7 text-white relative z-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-base text-gray-600 dark:text-slate-400 leading-relaxed font-medium">
                    {feature.desc}
                  </p>
                </div>
                
                {/* Visual Decoration for larger cards */}
                {feature.colSpan === "md:col-span-8" && (
                  <div className="mt-8 h-32 w-full bg-gradient-to-r from-gray-100 to-gray-50 dark:from-slate-700 dark:to-slate-800 rounded-xl overflow-hidden relative">
                    <div className="absolute top-4 left-4 right-4 h-full flex gap-2">
                      {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                        <motion.div 
                          initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ delay: 0.5 + (i * 0.1) }}
                          key={i} className="flex-1 bg-gradient-to-t from-primary-400 to-cyan-400 rounded-t-sm opacity-80" 
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {feature.colSpan === "md:col-span-12" && (
                  <div className="mt-8 h-40 w-full bg-gray-100 dark:bg-slate-700/50 rounded-xl overflow-hidden relative flex items-center justify-center">
                     <div className="flex gap-4">
                        {["Resilient", "Ephemeral", "Serendipity", "Ubiquitous"].map((word, i) => (
                          <motion.div 
                            key={word}
                            animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
                            className="bg-white dark:bg-slate-800 px-6 py-4 rounded-xl shadow-lg border border-gray-200 dark:border-white/10"
                          >
                            <span className="font-bold text-gray-800 dark:text-white">{word}</span>
                          </motion.div>
                        ))}
                     </div>
                  </div>
                )}
              </div>
            </AppCard>
          ))}
        </div>
      </div>
    </section>
  );
}
