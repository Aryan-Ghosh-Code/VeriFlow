// =============================================================================
// CollateralX Protocol – Button UI Component
// =============================================================================

import React from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size    = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClass: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-900/30",
  secondary:
    "bg-[var(--surface-soft)] border border-[var(--border-soft)] hover:bg-[var(--surface)] text-[var(--text-strong)]",
  ghost:
    "bg-transparent hover:bg-[var(--surface-soft)] text-[var(--text-muted)] hover:text-[var(--text-strong)]",
  danger:
    "bg-red-600/20 border border-red-500/40 hover:bg-red-600/30 text-red-400 hover:text-red-300",
};

const sizeClass: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium",
        "transition-all duration-200 ease-out cursor-pointer",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantClass[variant],
        sizeClass[size],
        className,
      ].join(" ")}
    >
      {loading ? (
        <span className="h-4 w-4 rounded-full border-2 border-[var(--text-subtle)] border-t-[var(--text-strong)] animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
