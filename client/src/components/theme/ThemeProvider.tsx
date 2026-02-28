"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const THEME_STORAGE_KEY = "veriflow-theme-mode";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(mode: ThemeMode): ResolvedTheme {
  const resolved = mode === "system" ? getSystemTheme() : mode;
  const root = document.documentElement;

  root.dataset.theme = resolved;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;

  return resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const initialMode: ThemeMode =
      stored === "light" || stored === "dark" || stored === "system" ? stored : "system";

    setMode(initialMode);
    setResolvedTheme(applyTheme(initialMode));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    localStorage.setItem(THEME_STORAGE_KEY, mode);
    setResolvedTheme(applyTheme(mode));

    if (mode !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolvedTheme(applyTheme("system"));
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [mode, hydrated]);

  const value = useMemo(
    () => ({
      mode,
      resolvedTheme,
      setMode,
    }),
    [mode, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
