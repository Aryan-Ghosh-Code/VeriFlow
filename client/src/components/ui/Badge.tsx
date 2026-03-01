// =============================================================================
// VeriFlow Protocol – Badge UI Component
// =============================================================================

import React from "react";

type BadgeVariant = "amber" | "zinc" | "yellow" | "green" | "red" | "blue" | "violet";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

const variantClass: Record<BadgeVariant, string> = {
  amber:  "bg-amber-500/15  border-amber-500/30  text-amber-300",
  zinc:   "bg-zinc-400/10   border-zinc-400/25   text-zinc-300",
  yellow: "bg-yellow-400/15 border-yellow-400/30 text-yellow-300",
  green:  "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
  red:    "bg-red-500/15    border-red-500/30    text-red-300",
  blue:   "bg-blue-500/15   border-blue-500/30   text-blue-300",
  violet: "bg-violet-500/15 border-violet-500/30 text-violet-300",
};

const dotClass: Record<BadgeVariant, string> = {
  amber:  "bg-amber-400",
  zinc:   "bg-zinc-400",
  yellow: "bg-yellow-400",
  green:  "bg-emerald-400",
  red:    "bg-red-400",
  blue:   "bg-blue-400",
  violet: "bg-violet-400",
};

export function Badge({
  children,
  variant = "violet",
  size = "md",
  dot = false,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
        variantClass[variant],
        className,
      ].join(" ")}
    >
      {dot && (
        <span className={["w-1.5 h-1.5 rounded-full", dotClass[variant]].join(" ")} />
      )}
      {children}
    </span>
  );
}
