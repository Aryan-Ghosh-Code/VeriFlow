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
 * Mirrors `calculateDeposit` in CollateralX.sol exactly.
 *
 *   effScore        = min(trustScore, 85)                    // score above 85 gives no benefit
 *   diff            = 85 − effScore                          // distance from gold cap
 *   depositPercent  = 30 + (7075 × diff²) / 722500          // quadratic curve, 30% floor
 *   base            = assetValueEth × depositPercent / 100
 *   surcharge       = +1% per week of duration, capped at +10%
 *   deposit         = base + surcharge
 *
 *   platformFee     = deposit × renterFeeBP (1%)             // deducted at completeRental, not upfront
 *   refundable      = deposit − platformFee                   // returned after clean completion
 *
 * Score curve (matches on-chain table):
 *   score 10  → ~81%  |  score 50  → ~42%  |  score 85+ → 30%
 */
export function calcDeposit(
  assetValueEth: number,
  trustScore: number,
  durationSecs = 0,   // 0 = no surcharge (listing-card summary mode)
): { deposit: number; platformFee: number; refundable: number } {
  // Clamp to valid range, then cap at 85 (matches EFFECTIVE_SCORE_CAP constant)
  const clamped  = Math.max(TRUST_SCORE_MIN, Math.min(TRUST_SCORE_MAX, trustScore));
  const effScore = Math.min(clamped, 85);

  // ── Exact Solidity formula ────────────────────────────────────────────────
  //   uint256 diff = 85 - effScore;
  //   uint256 pct  = 30 + (7075 * diff * diff) / 722500;
  const diff = 85 - effScore;
  const pct  = 30 + (7075 * diff * diff) / 722500;   // naturally ≥ 30

  const base = assetValueEth * (pct / 100);

  // Duration surcharge: +1% per week, capped at 10% (mirrors Solidity)
  //   uint256 weeks_ = _duration / 1 weeks;
  //   surcharge = min(base * weeks_ / 100,  base * 10 / 100)
  const weeks_      = Math.floor(durationSecs / (7 * 86400));
  const surcharge   = base * (Math.min(weeks_, 10) / 100);
  const deposit     = base + surcharge;

  // renterFeeBP = 100 (1%) — charged at completeRental, shown here for UI preview
  const platformFee = deposit * PLATFORM_FEE_RATE;
  const refundable  = deposit - platformFee;
  return { deposit, platformFee, refundable };
}

/**
 * Mirrors the rental-fee calculation in `startRental` in CollateralX.sol.
 *
 *   uint256 days_   = _duration / 1 days;
 *   uint256 finalAmt = listing.rentalFeePerDay * days_;
 *
 * @param rentalFeePerDayEth  – `listing.rentalFeePerDay` converted from Wei to ETH
 * @param durationSecs        – rental duration in seconds
 */
export function calcRentalFee(
  rentalFeePerDayEth: number,
  durationSecs: number,
): number {
  const days = Math.floor(durationSecs / 86400);   // integer division, same as Solidity
  return rentalFeePerDayEth * days;
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
