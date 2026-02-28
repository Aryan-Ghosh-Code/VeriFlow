"use client";

import React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemeMode } from "./ThemeProvider";

const OPTIONS: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { value: "light", label: "Light", icon: <Sun className="h-3.5 w-3.5" /> },
  { value: "dark", label: "Dark", icon: <Moon className="h-3.5 w-3.5" /> },
  { value: "system", label: "System", icon: <Monitor className="h-3.5 w-3.5" /> },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { mode, setMode } = useTheme();

  return (
    <div className={["inline-flex rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] p-0.5", compact ? "" : "gap-0.5"].join(" ")}>
      {OPTIONS.map((option) => {
        const active = mode === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setMode(option.value)}
            className={[
              "inline-flex items-center justify-center rounded-md transition-all",
              compact ? "h-8 w-8" : "gap-1.5 px-2.5 py-1.5 text-xs font-medium",
              active
                ? "bg-[var(--surface)] text-[var(--text-strong)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[var(--surface)]/80",
            ].join(" ")}
            aria-label={`Switch to ${option.label} mode`}
            title={option.label}
          >
            {option.icon}
            {!compact && <span>{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
