// =============================================================================
// CollateralX Protocol – Deposit Breakdown Component
// =============================================================================

import React from "react";
import { formatEth } from "@/lib/utils";
import { PLATFORM_FEE_RATE } from "@/config";

interface DepositBreakdownProps {
  assetValue: number;
  trustScore: number;
  deposit: number;
  platformFee: number;
  refundable: number;
}

export function DepositBreakdown({
  assetValue,
  trustScore,
  deposit,
  platformFee,
  refundable,
}: DepositBreakdownProps) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 bg-violet-500/5 border-b border-white/5">
        <p className="text-xs font-semibold text-violet-300 uppercase tracking-widest">Deposit Calculation</p>
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* Formula */}
        <div className="rounded-xl bg-black/20 border border-white/5 px-4 py-3 font-mono text-xs text-white/50">
          <span className="text-white/70">Deposit</span>
          {" = "}
          <span className="text-violet-300">{formatEth(assetValue)}</span>
          {" × (1 − "}
          <span className="text-yellow-300">{trustScore}</span>
          {" / 100)"}
          {" = "}
          <span className="text-emerald-300 font-semibold">{formatEth(deposit)}</span>
        </div>

        {/* Line items */}
        <div className="space-y-2">
          <Row label="Asset Value"      value={formatEth(assetValue)}  />
          <Row label="Trust Score"      value={`${trustScore} / 100`} muted />
          <Row label="Gross Deposit"    value={formatEth(deposit)}     />
          <div className="h-px bg-white/5" />
          <Row
            label={`Platform Fee (${PLATFORM_FEE_RATE * 100}%)`}
            value={`− ${formatEth(platformFee)}`}
            accent="red"
          />
          <Row
            label="Required Deposit"
            value={formatEth(deposit)}
            accent="violet"
            bold
          />
          <div className="h-px bg-white/5" />
          <Row
            label="Refundable on completion"
            value={formatEth(refundable)}
            accent="green"
            bold
          />
        </div>
      </div>
    </div>
  );
}

type Accent = "default" | "red" | "violet" | "green";

function Row({
  label,
  value,
  accent = "default",
  bold = false,
  muted = false,
}: {
  label: string;
  value: string;
  accent?: Accent;
  bold?: boolean;
  muted?: boolean;
}) {
  const valueClass = {
    default: "text-white/70",
    red:     "text-red-400",
    violet:  "text-violet-300",
    green:   "text-emerald-400",
  }[accent];

  return (
    <div className="flex items-center justify-between">
      <span className={["text-xs", muted ? "text-white/30" : "text-white/50"].join(" ")}>{label}</span>
      <span className={["text-xs", bold ? "font-semibold" : "", valueClass].join(" ")}>{value}</span>
    </div>
  );
}
