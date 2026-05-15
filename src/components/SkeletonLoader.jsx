"use client";

export default function SkeletonLoader({ className = "", lines = 3 }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-4"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-200/60 p-6 space-y-4 ${className}`}
    >
      <div className="skeleton h-5 w-2/5" />
      <div className="skeleton h-10 w-3/5" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-4/5" />
    </div>
  );
}
