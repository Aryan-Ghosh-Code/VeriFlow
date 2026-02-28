// =============================================================================
// CollateralX Protocol – Toast Notification System
// =============================================================================

"use client";

import React, { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

const icons: Record<string, string> = {
  success: "✓",
  error:   "✕",
  info:    "ℹ",
  loading: "⟳",
};

const colors: Record<string, string> = {
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  error:   "border-red-500/40    bg-red-500/10    text-red-300",
  info:    "border-blue-500/40   bg-blue-500/10   text-blue-300",
  loading: "border-violet-500/40 bg-violet-500/10 text-violet-300",
};

const iconBg: Record<string, string> = {
  success: "bg-emerald-500/20 text-emerald-400",
  error:   "bg-red-500/20     text-red-400",
  info:    "bg-blue-500/20    text-blue-400",
  loading: "bg-violet-500/20  text-violet-400",
};

export function ToastContainer() {
  const { toasts, removeToast } = useAppStore();

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={[
            "flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl",
            "pointer-events-auto w-80 max-w-xs animate-[slideUp_0.3s_ease-out]",
            "shadow-xl shadow-black/40",
            colors[toast.type],
          ].join(" ")}
        >
          <span
            className={[
              "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold",
              toast.type === "loading" ? "animate-spin" : "",
              iconBg[toast.type],
            ].join(" ")}
          >
            {icons[toast.type]}
          </span>
          <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-white/30 hover:text-white/70 transition-colors ml-1"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
