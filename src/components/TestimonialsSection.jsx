"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Minh Tuấn",
    role: "Sinh viên Đại học",
    avatar: "MT",
    color: "from-primary-400 to-primary-500",
    stars: 5,
    text: "ENG VOCA giúp mình nhớ từ lâu hơn rất nhiều so với cách học truyền thống. Thuật toán SM2 kết hợp AI dự đoán điểm quên thực sự hiệu quả!",
  },
  {
    name: "Thu Hà",
    role: "Nhân viên văn phòng",
    avatar: "TH",
    color: "from-secondary-400 to-secondary-500",
    stars: 5,
    text: "Tính năng AI tạo ví dụ rất hữu ích. Mình hiểu nghĩa từ sâu hơn khi có ngữ cảnh cụ thể. Giao diện Dark Mode cũng rất đẹp và dễ dùng ban đêm.",
  },
  {
    name: "Đức Anh",
    role: "Học sinh IELTS",
    avatar: "DA",
    color: "from-emerald-400 to-teal-500",
    stars: 5,
    text: "Game hóa trong ENG VOCA khiến mình không thể bỏ học được. Streak 30 ngày rồi! Lộ trình luyện thi B2 cực kỳ sát thực tế.",
  },
  {
    name: "Hoàng Oanh",
    role: "Người đi làm",
    avatar: "HO",
    color: "from-orange-400 to-rose-500",
    stars: 5,
    text: "Mỗi ngày mình chỉ tốn 15 phút ôn tập trên xe bus nhưng lượng từ vựng tăng đáng kể. Đồng bộ điện thoại và máy tính cực nhanh.",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-24 relative overflow-hidden bg-transparent">
      {/* Background glow */}
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-5 py-2 rounded-full bg-white/50 dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 text-amber-600 dark:text-amber-400 text-sm font-bold mb-6 tracking-wide shadow-sm">
            ⭐ ĐÁNH GIÁ TỪ HỌC VIÊN
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white mb-6 tracking-tight">
            Cộng đồng <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">10.000+</span> người dùng
          </h2>
          <p className="text-xl text-gray-500 dark:text-slate-400 max-w-2xl mx-auto font-medium">
            Những câu chuyện thành công từ những người đã thay đổi cách học tiếng Anh nhờ ENG VOCA.
          </p>
        </motion.div>

        {/* Testimonial Cards - Infinite Scroll Marquee Effect */}
        <div className="relative w-full overflow-hidden flex flex-col gap-6 mask-image-fade">
          
          <motion.div 
            className="flex gap-6 w-max"
            animate={{ x: [0, -1000] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          >
            {/* Double the array for seamless infinite scroll */}
            {[...TESTIMONIALS, ...TESTIMONIALS].map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                className="w-[350px] sm:w-[400px] shrink-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl border border-gray-200/60 dark:border-white/10 p-8 shadow-xl hover:shadow-2xl hover:border-primary-500/50 transition-all duration-300 relative group"
              >
                <div className="absolute top-6 right-6 opacity-10 group-hover:opacity-20 dark:opacity-5 dark:group-hover:opacity-10 transition-opacity">
                  <Quote className="w-12 h-12 text-gray-900 dark:text-white" />
                </div>

                <div className="flex gap-1.5 mb-6">
                  {Array.from({ length: item.stars }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400 drop-shadow-sm" />
                  ))}
                </div>

                <p className="text-base text-gray-700 dark:text-slate-300 leading-relaxed mb-8 relative z-10 font-medium">
                  &ldquo;{item.text}&rdquo;
                </p>

                <div className="flex items-center gap-4 border-t border-gray-100 dark:border-white/5 pt-6 mt-auto">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white text-base font-bold shadow-lg`}>
                    {item.avatar}
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900 dark:text-white">
                      {item.name}
                    </p>
                    <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>

        </div>
      </div>
      
      <style jsx>{`
        .mask-image-fade {
          -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
          mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
        }
      `}</style>
    </section>
  );
}
