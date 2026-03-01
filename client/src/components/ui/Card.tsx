// =============================================================================
// VeriFlow Protocol – Card UI Component (Glassmorphism)
// =============================================================================

"use client";

import React from "react";
import { motion } from "framer-motion";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}

export function Card({ children, className = "", hover = false, glow = false }: CardProps) {
  const baseClasses = [
    "relative rounded-2xl border border-[var(--border-soft)]",
    "bg-[var(--surface-soft)] backdrop-blur-xl flex flex-col w-full",
    glow && "shadow-[0_0_30px_rgba(139,92,246,0.08)]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (hover) {
    return (
      <motion.div
        whileHover={{
          y: -4,
          scale: 1.01,
          borderColor: "rgba(255,255,255,0.15)",
          backgroundColor: "rgba(255,255,255,0.05)",
          boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5), 0 0 40px -10px rgba(139,92,246,0.15)"
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={baseClasses}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={baseClasses}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={["px-6 pt-6 pb-4 border-b border-[var(--border-soft)]", className].join(" ")}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={["px-6 py-5 flex-1 flex flex-col", className].join(" ")}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={["px-6 pb-6 pt-4 border-t border-[var(--border-soft)]", className].join(" ")}>
      {children}
    </div>
  );
}
