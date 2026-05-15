"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

// Helper to generate random number
const random = (min, max) => Math.random() * (max - min) + min;

export default function AnimatedBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Dark overlay for dark mode only */}
      <div className="absolute inset-0 hidden dark:block bg-[#0B0F19]" />
      <div className="absolute inset-0 block dark:hidden bg-slate-50" />

      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-5 dark:opacity-10" />

      {/* Floating Orbs System */}
      
      {/* Orb 1: Primary */}
      <motion.div
        animate={{
          x: [0, 150, -50, 0],
          y: [0, -100, 100, 0],
          scale: [1, 1.2, 0.8, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[10%] left-[10%] w-[60vw] h-[60vw] md:w-[40vw] md:h-[40vw] max-w-[800px] max-h-[800px] bg-primary-400/20 dark:bg-primary-600/20 rounded-full blur-[100px] md:blur-[150px] mix-blend-multiply dark:mix-blend-screen"
      />

      {/* Orb 2: Secondary / Purple */}
      <motion.div
        animate={{
          x: [0, -200, 100, 0],
          y: [0, 150, -150, 0],
          scale: [1, 0.9, 1.3, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[40%] right-[10%] w-[50vw] h-[50vw] md:w-[35vw] md:h-[35vw] max-w-[700px] max-h-[700px] bg-secondary-400/20 dark:bg-secondary-600/20 rounded-full blur-[100px] md:blur-[150px] mix-blend-multiply dark:mix-blend-screen"
      />

      {/* Orb 3: Cyan */}
      <motion.div
        animate={{
          x: [0, 100, -150, 0],
          y: [0, -200, 50, 0],
          scale: [1, 1.5, 0.8, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-[10%] left-[30%] w-[40vw] h-[40vw] md:w-[30vw] md:h-[30vw] max-w-[600px] max-h-[600px] bg-cyan-400/20 dark:bg-cyan-500/15 rounded-full blur-[100px] md:blur-[150px] mix-blend-multiply dark:mix-blend-screen"
      />

      {/* Floating Particles (Stars) - Dark mode only */}
      <div className="absolute inset-0 hidden dark:block">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: random(1, 3),
              height: random(1, 3),
              top: `${random(0, 100)}%`,
              left: `${random(0, 100)}%`,
              opacity: random(0.2, 0.8),
            }}
            animate={{
              y: [0, random(-100, -30)],
              opacity: [0, random(0.5, 1), 0],
            }}
            transition={{
              duration: random(10, 20),
              repeat: Infinity,
              ease: "linear",
              delay: random(0, 20),
            }}
          />
        ))}
      </div>
    </div>
  );
}
