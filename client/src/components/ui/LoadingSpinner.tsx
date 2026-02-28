// =============================================================================
// CollateralX Protocol – Loading Spinner
// =============================================================================

import React from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

const sizeMap = { sm: "h-4 w-4", md: "h-8 w-8", lg: "h-12 w-12" };

export function LoadingSpinner({ size = "md", label }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={[
          "rounded-full border-2 border-[var(--border-soft)] border-t-violet-500 animate-spin",
          sizeMap[size],
        ].join(" ")}
      />
      {label && <p className="text-sm text-[var(--text-muted)]">{label}</p>}
    </div>
  );
}
