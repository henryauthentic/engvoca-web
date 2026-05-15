"use client";

import { motion } from "framer-motion";

export function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-slate-800 rounded-xl ${className}`}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Hero */}
      <Skeleton className="w-full h-[250px] rounded-2xl" />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[100px]" />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="w-[150px] h-6 mb-4" />
          <div className="grid sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="w-[150px] h-6 mt-8 mb-4" />
          <Skeleton className="w-full h-40" />
        </div>
        <div className="space-y-4">
          <Skeleton className="w-full h-[180px]" />
          <Skeleton className="w-full h-[120px]" />
          <Skeleton className="w-full h-[250px]" />
        </div>
      </div>
    </div>
  );
}
