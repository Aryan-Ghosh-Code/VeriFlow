// =============================================================================
// CollateralX Protocol – Tier Badge Component
// =============================================================================

"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import type { TrustTier } from "@/types/rental";

interface TierBadgeProps {
  tier: TrustTier;
  score?: number;
  compact?: boolean;
}

const TIER_ICON: Record<string, string> = {
  Bronze: "🥉",
  Silver: "🥈",
  Gold:   "🥇",
};

export function TierBadge({ tier, score, compact = false }: TierBadgeProps) {
  return (
    <Badge variant={tier.color} size={compact ? "sm" : "md"}>
      <span>{TIER_ICON[tier.name]}</span>
      <span>{tier.name}</span>
      {score !== undefined && !compact && (
        <span className="opacity-70">· {score}</span>
      )}
    </Badge>
  );
}
