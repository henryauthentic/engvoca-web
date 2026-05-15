"use client";

import { motion } from "framer-motion";

export default function PrimaryButton({
  children,
  variant = "primary",
  size = "md",
  className = "",
  href,
  onClick,
  ...props
}) {
  const baseClasses =
    "btn-ripple relative inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-300 cursor-pointer select-none";

  const variants = {
    primary:
      "bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:from-primary-600 hover:to-secondary-600 shadow-lg hover:shadow-xl hover:shadow-primary-500/25",
    secondary:
      "bg-white text-gray-800 border-2 border-gray-200 hover:border-primary-300 hover:text-primary-600 shadow-sm hover:shadow-md",
    ghost:
      "bg-transparent text-primary-600 hover:bg-primary-50",
  };

  const sizes = {
    sm: "px-5 py-2.5 text-sm gap-2",
    md: "px-7 py-3.5 text-base gap-2.5",
    lg: "px-9 py-4.5 text-lg gap-3",
  };

  const allClasses = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`;

  const motionProps = {
    whileHover: { scale: 1.03 },
    whileTap: { scale: 0.97 },
    transition: { type: "spring", stiffness: 400, damping: 17 },
  };

  if (href) {
    return (
      <motion.a href={href} className={allClasses} {...motionProps} {...props}>
        {children}
      </motion.a>
    );
  }

  return (
    <motion.button
      className={allClasses}
      onClick={onClick}
      {...motionProps}
      {...props}
    >
      {children}
    </motion.button>
  );
}
