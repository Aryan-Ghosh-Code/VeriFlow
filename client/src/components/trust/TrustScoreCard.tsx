// =============================================================================
// CollateralX Protocol – Trust Score Card
// =============================================================================

"use client";

import React from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { TierBadge } from "./TierBadge";
import { TRUST_SCORE_MIN, TRUST_SCORE_MAX } from "@/config";
import type { TrustTier } from "@/types/rental";

interface TrustScoreCardProps {
  score: number;
  tier: TrustTier;
  isLoading?: boolean;
}

const tierGradient: Record<string, string> = {
  Bronze: "from-amber-500 to-orange-600",
  Silver: "from-zinc-400  to-slate-500",
  Gold:   "from-yellow-400 to-amber-500",
};

const tierShadow: Record<string, string> = {
  Bronze: "shadow-amber-900/20",
  Silver: "shadow-zinc-900/20",
  Gold:   "shadow-yellow-900/20",
};

export function TrustScoreCard({ score, tier, isLoading = false }: TrustScoreCardProps) {
  const pct = ((score - TRUST_SCORE_MIN) / (TRUST_SCORE_MAX - TRUST_SCORE_MIN)) * 100;

  return (
    <Card glow className={`shadow-xl ${tierShadow[tier.name]}`}>
      <CardBody className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-white/40 uppercase tracking-widest">Trust Score</p>
          <TierBadge tier={tier} />
        </div>

        {isLoading ? (
          <div className="h-14 flex items-center justify-center">
            <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-violet-500 animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex items-end gap-2">
              <span className={`text-5xl font-black bg-gradient-to-r ${tierGradient[tier.name]} bg-clip-text text-transparent`}>
                {score}
              </span>
              <span className="text-white/30 text-lg pb-1">/100</span>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${tierGradient[tier.name]} transition-all duration-700 ease-out`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-white/30">
                <span>Bronze</span><span>Silver</span><span>Gold</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <StatBox label="+10 per" value="Rental ✓" />
              <StatBox label="−20 per" value="Dispute ✗" />
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/3 border border-white/5 px-3 py-2">
      <p className="text-[10px] text-white/30">{label}</p>
      <p className="text-xs font-semibold text-white/70">{value}</p>
    </div>
  );
}
