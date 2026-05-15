"use client";

import { motion } from "framer-motion";

export default function StatsCard({ icon, label, value, sub, gradient, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="portal-card p-5 flex items-center gap-4"
    >
      <div
        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg flex-shrink-0`}
      >
        <span className="text-xl">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-extrabold text-foreground">{value}</p>
        <p className="text-xs text-gray-500 truncate">{label}</p>
      </div>
      {sub && (
        <span className="text-xs font-medium text-success bg-success-light px-2 py-1 rounded-full flex-shrink-0">
          {sub}
        </span>
      )}
    </motion.div>
  );
}
