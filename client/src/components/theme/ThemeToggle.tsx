"use client";

import React, { useState, useRef, useEffect } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemeMode } from "./ThemeProvider";

const OPTIONS: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { value: "light",  label: "Light",  icon: <Sun     className="h-3.5 w-3.5" /> },
  { value: "dark",   label: "Dark",   icon: <Moon    className="h-3.5 w-3.5" /> },
  { value: "system", label: "System", icon: <Monitor className="h-3.5 w-3.5" /> },
];

const ICON_MAP: Record<ThemeMode, React.ReactNode> = {
  light:  <Sun     className="h-3.5 w-3.5" />,
  dark:   <Moon    className="h-3.5 w-3.5" />,
  system: <Monitor className="h-3.5 w-3.5" />,
};

/** Single icon button — click to expand a tiny dropdown with theme choices */
export function ThemeToggle({ compact: _compact = false }: { compact?: boolean }) {
  const { mode, setMode } = useTheme();
  const [open, setOpen]   = useState(false);
  const ref               = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all duration-200"
        title={`Theme: ${mode}`}
        aria-label="Toggle theme"
      >
        {ICON_MAP[mode]}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-elevated)] shadow-xl shadow-black/30 p-1 flex flex-col gap-0.5 min-w-[110px] animate-in fade-in slide-in-from-top-1 duration-150">
          {OPTIONS.map((opt) => {
            const active = mode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setMode(opt.value); setOpen(false); }}
                className={[
                  "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium w-full text-left transition-colors duration-150",
                  active
                    ? "bg-violet-500/15 text-violet-300 border border-violet-500/20"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text-strong)]",
                ].join(" ")}
              >
                {opt.icon}
                {opt.label}
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
