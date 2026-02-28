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
  id: string;          // MongoDB document _id (hex)
  chainId?: string;    // on-chain listing ID (uint256 as string, e.g. "1", "2")
  owner: string;       // wallet address of the lister
  assetName: string;
  description: string;
  assetValue: string;  // in ETH string
  imageUrl?: string;
  category?: string;
  location?: string;   // physical pickup/return address
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
  depositPaid: string;    // in ETH string
  platformFee: string;    // in ETH string
  refundable: string;     // in ETH string
  finalAmount?: string;   // in ETH — rental fee due at end
  finalPaid?: boolean;    // whether payFinalAmount has been called
  renterPhone?: string;   // for coordination display
  status: RentalStatus;
  startedAt: number;
  endTime?: number;       // UNIX timestamp when rental expires
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
