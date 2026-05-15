"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * Admin StatCard — Dashboard metric card with trend indicator
 *
 * @param {Object} props
 * @param {string} props.label - Metric label
 * @param {string|number} props.value - Main value
 * @param {number} props.trend - Percentage change (positive = up, negative = down)
 * @param {string} props.trendLabel - e.g. "so với hôm qua"
 * @param {React.ReactNode} props.icon - Lucide icon component
 * @param {string} props.color - "blue" | "green" | "orange" | "red" | "purple"
 */
export default function StatCard({
  label,
  value,
  trend,
  trendLabel = "",
  icon: Icon,
  color = "blue",
  delay = 0,
}) {
  const colorMap = {
    blue: {
      bg: "from-blue-500/10 to-blue-600/5",
      icon: "bg-blue-500/15 text-blue-600",
      ring: "ring-blue-500/20",
    },
    green: {
      bg: "from-emerald-500/10 to-emerald-600/5",
      icon: "bg-emerald-500/15 text-emerald-600",
      ring: "ring-emerald-500/20",
    },
    orange: {
      bg: "from-orange-500/10 to-orange-600/5",
      icon: "bg-orange-500/15 text-orange-600",
      ring: "ring-orange-500/20",
    },
    red: {
      bg: "from-red-500/10 to-red-600/5",
      icon: "bg-red-500/15 text-red-600",
      ring: "ring-red-500/20",
    },
    purple: {
      bg: "from-purple-500/10 to-purple-600/5",
      icon: "bg-purple-500/15 text-purple-600",
      ring: "ring-purple-500/20",
    },
  };

  const c = colorMap[color] || colorMap.blue;

  const TrendIcon =
    trend == null ? null : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className={`glass-panel hover-lift p-5 bg-gradient-to-br ${c.bg} overflow-hidden relative group`}
    >
      {/* Background decoration */}
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br from-white/5 to-white/0 group-hover:scale-150 transition-transform duration-500" />

      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${c.icon} flex items-center justify-center`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
        {TrendIcon && (
          <div
            className={`flex items-center gap-1 text-xs font-semibold ${
              trend > 0 ? "text-emerald-600" : trend < 0 ? "text-red-500" : "text-gray-400"
            }`}
          >
            <TrendIcon className="w-3.5 h-3.5" />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      <div>
        <p className="text-2xl font-bold text-foreground tracking-tight font-mono">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        <p className="text-xs text-gray-500 mt-1 font-medium">
          {label}
          {trendLabel && <span className="text-gray-400 ml-1">• {trendLabel}</span>}
        </p>
      </div>
    </motion.div>
  );
}
