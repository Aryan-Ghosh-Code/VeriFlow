// =============================================================================
// VeriFlow Protocol – App Configuration
// =============================================================================

export const APP_CONFIG = {
  name: "VeriFlow Protocol",
  tagline: "Programmable Trust for Rental Collateral",
  description:
    "A decentralized, risk-based collateral protocol for informal asset rentals. Dynamically adjusts security deposits based on your on-chain trust score.",
} as const;

// ─── Contract ────────────────────────────────────────────────────────────────

export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545";

// ─── Trust Engine ────────────────────────────────────────────────────────────

export const TRUST_SCORE_INITIAL = 50;
export const TRUST_SCORE_MIN = 0;
export const TRUST_SCORE_MAX = 100;
export const TRUST_SCORE_GAIN = 10;  // per successful rental
export const TRUST_SCORE_LOSS = 20;  // per dispute

export const TRUST_TIERS = {
  bronze: { min: 0,  max: 40,  label: "Bronze", color: "amber"  },
  silver: { min: 41, max: 70,  label: "Silver", color: "zinc"   },
  gold:   { min: 71, max: 100, label: "Gold",   color: "yellow" },
} as const;

// ─── Protocol Economics ───────────────────────────────────────────────────────

/** Platform fee as a decimal fraction (1 %) */
export const PLATFORM_FEE_RATE = 0.01;

// ─── Currency ────────────────────────────────────────────────────────────────

/**
 * Static ETH → INR conversion rate.
 * Update this value to reflect current market rates.
 * 1 ETH ≈ ₹2,50,000 (approximate, used for display only)
 */
export const ETH_TO_INR = 250_000;
