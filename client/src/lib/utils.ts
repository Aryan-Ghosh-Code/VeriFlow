// =============================================================================
// CollateralX Protocol – Utility Functions
// =============================================================================

import { ethers } from "ethers";
import {
  PLATFORM_FEE_RATE,
  TRUST_TIERS,
  TRUST_SCORE_MIN,
  TRUST_SCORE_MAX,
} from "@/config";
import type { TrustTier, TrustTierName } from "@/types/rental";

// ─── Deposit Calculator ───────────────────────────────────────────────────────

/**
 * Deposit = AssetValue × (1 − TrustScore / 100)
 * Platform fee = 1% of deposit
 */
export function calcDeposit(assetValueEth: number, trustScore: number): {
  deposit: number;
  platformFee: number;
  refundable: number;
} {
  const clamped = Math.max(TRUST_SCORE_MIN, Math.min(TRUST_SCORE_MAX, trustScore));
  const deposit  = assetValueEth * (1 - clamped / 100);
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
