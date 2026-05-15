"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle, MessageCircleQuestion } from "lucide-react";

const FAQ_DATA = [
  {
    q: "ENG VOCA có miễn phí không?",
    a: "Có! ENG VOCA hoàn toàn miễn phí cho các tính năng học cốt lõi. Bạn có thể sử dụng tất cả tính năng cơ bản mà không cần trả bất kỳ chi phí nào.",
  },
  {
    q: "Thuật toán SM2 (Spaced Repetition) hoạt động như thế nào?",
    a: "SM2 là thuật toán lặp lại ngắt quãng. Hệ thống AI sẽ phân tích bộ nhớ của bạn để tính toán thời điểm tối ưu nhắc lại từ vựng. Những từ bạn nhớ tốt sẽ được ôn thưa hơn, những từ khó sẽ xuất hiện thường xuyên hơn. Giúp tiết kiệm 80% thời gian học.",
  },
  {
    q: "Tôi có thể học trên những thiết bị nào?",
    a: "ENG VOCA là hệ sinh thái đa nền tảng. Bạn có thể học trên Điện thoại (Android/iOS) qua App, hoặc dùng máy tính bảng, Laptop qua Web Portal. Mọi tiến độ đều được đồng bộ Real-time.",
  },
  {
    q: "AI trong ENG VOCA có tác dụng gì?",
    a: "Thay vì học định nghĩa nhàm chán, AI của chúng tôi sẽ tự động phân tích từ vựng, tạo ra các câu ví dụ sát với ngữ cảnh thực tế của riêng bạn, và sinh ra các câu trắc nghiệm thông minh để kiểm tra trí nhớ.",
  },
  {
    q: "Dữ liệu học tập của tôi có an toàn không?",
    a: "Tuyệt đối an toàn. Toàn bộ dữ liệu tiến trình học, điểm XP, Streak của bạn được lưu trữ và mã hóa bảo mật trên hệ thống máy chủ Cloud của Google (Firebase).",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0); // Mở sẵn câu đầu tiên

  return (
    <section id="faq" className="py-24 relative overflow-hidden bg-transparent">
      {/* Background Decorative */}
      <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/50 dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 text-primary-600 dark:text-primary-400 text-sm font-bold mb-6 tracking-wide shadow-sm">
            <MessageCircleQuestion className="w-4 h-4" />
            HỖ TRỢ TRỰC TUYẾN
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white mb-6 tracking-tight">
            Câu hỏi <span className="bg-gradient-to-r from-blue-500 to-primary-500 bg-clip-text text-transparent">thường gặp</span>
          </h2>
          <p className="text-xl text-gray-500 dark:text-slate-400 max-w-2xl mx-auto font-medium">
            Giải đáp mọi thắc mắc của bạn về thuật toán SM2, hệ thống AI và cách ENG VOCA hoạt động.
          </p>
        </motion.div>

        {/* FAQ List */}
        <div className="space-y-4">
          {FAQ_DATA.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isOpen 
                    ? "bg-white dark:bg-slate-800/80 border-primary-400 dark:border-primary-500/50 shadow-lg shadow-primary-500/10 dark:shadow-[0_0_30px_rgba(59,130,246,0.1)] backdrop-blur-xl" 
                    : "bg-white/60 dark:bg-slate-800/40 border-gray-200/60 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20 backdrop-blur-md"
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between px-6 sm:px-8 py-6 text-left cursor-pointer group"
                >
                  <span className={`text-base sm:text-lg font-bold pr-4 transition-colors ${
                    isOpen ? "text-primary-600 dark:text-primary-400" : "text-gray-800 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-gray-100"
                  }`}>
                    {item.q}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      isOpen ? "bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400" : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 group-hover:bg-primary-50 dark:group-hover:bg-slate-600"
                    }`}
                  >
                    <ChevronDown className="w-5 h-5" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-6 sm:px-8 pb-6 pt-0">
                        <div className="h-px w-full bg-gray-100 dark:bg-white/5 mb-6" />
                        <p className="text-base text-gray-600 dark:text-slate-300 leading-relaxed font-medium">
                          {item.a}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
