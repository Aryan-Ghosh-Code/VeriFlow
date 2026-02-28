// =============================================================================
// CollateralX Protocol – Domain Types
// =============================================================================

// ─── Trust ───────────────────────────────────────────────────────────────────

export type TrustTierName = "Bronze" | "Silver" | "Gold";

export interface TrustTier {
  name: TrustTierName;
  color: "amber" | "zinc" | "yellow";
  min: number;
  max: number;
}

// ─── Listing ─────────────────────────────────────────────────────────────────

export interface Listing {
  id: string;          // on-chain listing ID (BigInt string)
  owner: string;       // wallet address of the lister
  assetName: string;
  description: string;
  assetValue: string;  // in ETH string
  imageUrl?: string;
  isActive: boolean;
  createdAt: number;   // UNIX timestamp
}

// ─── Rental ──────────────────────────────────────────────────────────────────

export type RentalStatus = "Active" | "Completed" | "Disputed";

export interface ActiveRental {
  rentalId: string;
  listingId: string;
  assetName: string;
  renter: string;
  owner: string;
  depositPaid: string;   // in ETH string
  platformFee: string;   // in ETH string
  refundable: string;    // in ETH string
  status: RentalStatus;
  startedAt: number;
  completedAt?: number;
  txHash?: string;
}

// ─── Receipt ─────────────────────────────────────────────────────────────────

export interface RentalReceipt {
  rentalId: string;
  assetName: string;
  depositPaid: string;
  platformFee: string;
  refundedAmount: string;
  txHash: string;
  completedAt: number;
}

// ─── Contract Write Results ───────────────────────────────────────────────────

export interface ContractTx {
  hash: string;
  wait: () => Promise<unknown>;
}
