"use client";

import { motion } from "framer-motion";

export default function AppCard({
  children,
  className = "",
  hover = true,
  delay = 0,
  ...props
}) {
  return (
    <motion.div
      className={`bg-white dark:bg-slate-800/80 rounded-[2rem] border border-gray-200/60 dark:border-white/10 shadow-sm dark:shadow-none p-8 relative overflow-hidden backdrop-blur-md ${
        hover ? "hover:shadow-2xl hover:shadow-primary-500/10 dark:hover:border-white/20" : ""
      } transition-all duration-300 ${className}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      whileHover={hover ? { y: -5 } : {}}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
