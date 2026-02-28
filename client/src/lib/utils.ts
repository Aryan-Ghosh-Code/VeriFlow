// =============================================================================
// CollateralX Protocol – Utility Functions
// =============================================================================

import { ethers } from "ethers";
import {
  PLATFORM_FEE_RATE,
  TRUST_TIERS,
  TRUST_SCORE_MIN,
  TRUST_SCORE_MAX,
  ETH_TO_INR,
} from "@/config";
import type { TrustTier, TrustTierName } from "@/types/rental";

// ─── Deposit Calculator ───────────────────────────────────────────────────────

/**
 * Quadratic collateral formula — mirrors on-chain `calculateDeposit`.
 *
 *   effectiveScore  = min(trustScore, 85)          // 85-cap: score above gives no extra benefit
 *   depositPercent  = max(30, (100−eff)² / 100)    // quadratic decay with 30% floor
 *   deposit         = assetValueEth × depositPercent / 100
 *   platformFee     = deposit × 1%                 // renter fee (1 BP of collateral)
 *   refundable      = deposit − platformFee        // returned on clean completion
 *
 * Score curve (₹10,000 asset):
 *   0  → 100%  / 40 → 36%  / 60 → 30%  / 85+ → 30%
 */
export function calcDeposit(
  assetValueEth: number,
  trustScore: number,
  durationSecs = 0,          // optional: 0 means no surcharge (summary mode)
): { deposit: number; platformFee: number; refundable: number } {
  const clamped  = Math.max(TRUST_SCORE_MIN, Math.min(TRUST_SCORE_MAX, trustScore));
  const effScore = Math.min(clamped, 85);
  const diff     = 100 - effScore;
  const pct      = Math.max(30, (diff * diff) / 100);
  const base     = assetValueEth * (pct / 100);

  // Duration surcharge: +1% per week, capped at +10% (mirrors on-chain logic)
  const weeks     = Math.floor(durationSecs / (7 * 86400));
  const surchargePct = Math.min(weeks, 10);         // cap at 10 weeks
  const deposit   = base * (1 + surchargePct / 100);

  const platformFee = deposit * PLATFORM_FEE_RATE;
  const refundable  = deposit - platformFee;
  return { deposit, platformFee, refundable };
}

/** Format a value in ETH to a human-readable string */
export function formatEth(value: number | string, decimals = 4): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `${num.toFixed(decimals)} ETH`;
}

/** Parse Wei string to ETH number */
export function weiToEth(wei: bigint | string): number {
  return parseFloat(ethers.formatEther(wei));
}

/** ETH number → Wei BigInt */
export function ethToWei(eth: number | string): bigint {
  return ethers.parseEther(String(eth));
}

// ─── INR Conversion ───────────────────────────────────────────────────────────

/**
 * Convert an ETH amount (number) to INR using the static rate from config.
 * e.g. 0.5 ETH → 1,25,000
 */
export function ethToInr(eth: number): number {
  return eth * ETH_TO_INR;
}

/**
 * Format a number as an Indian Rupee string.
 * Uses the `en-IN` locale for lakh/crore grouping.
 * e.g. 250000 → "₹2,50,000"
 */
export function formatInr(amount: number, decimals = 0): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Convert ETH amount and immediately format as INR string.
 * Convenience wrapper: ethToInrStr(0.5) → "₹1,25,000"
 */
export function ethToInrStr(eth: number, decimals = 0): string {
  return formatInr(ethToInr(eth), decimals);
}

// ─── Trust Score ──────────────────────────────────────────────────────────────

export function getTrustTier(score: number): TrustTier {
  if (score <= TRUST_TIERS.bronze.max) {
    return { name: "Bronze" as TrustTierName, color: "amber",  min: TRUST_TIERS.bronze.min, max: TRUST_TIERS.bronze.max };
  }
  if (score <= TRUST_TIERS.silver.max) {
    return { name: "Silver" as TrustTierName, color: "zinc",   min: TRUST_TIERS.silver.min, max: TRUST_TIERS.silver.max };
  }
  return   { name: "Gold"   as TrustTierName, color: "yellow", min: TRUST_TIERS.gold.min,   max: TRUST_TIERS.gold.max  };
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

/** Format UNIX timestamp to locale string */
export function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Generate a unique local ID for optimistic updates */
export function genLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Truncate long strings */
export function truncate(str: string, max = 40): string {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}
