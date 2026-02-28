// =============================================================================
// CollateralX Protocol – Contract ABI & Instance Factory
// =============================================================================

import { ethers, Contract, JsonRpcSigner, JsonRpcProvider } from "ethers";
import { CONTRACT_ADDRESS } from "@/config";

// ---------------------------------------------------------------------------
// ABI – matches the CollateralX on-chain contract interface.
// ---------------------------------------------------------------------------

export const COLLATERAL_X_ABI = [
  // ── Events ────────────────────────────────────────────────────────────────
  "event ListingCreated(uint256 indexed listingId, address indexed owner, string assetName, uint256 assetValue)",
  "event RentalStarted(uint256 indexed rentalId, uint256 indexed listingId, address indexed renter, uint256 deposit)",
  "event RentalCompleted(uint256 indexed rentalId, uint256 refunded)",
  "event DisputeRaised(uint256 indexed rentalId)",

  // ── Read Functions ─────────────────────────────────────────────────────────
  "function getTrustScore(address user) view returns (uint256)",
  "function getListingCount() view returns (uint256)",
  "function getListing(uint256 listingId) view returns (tuple(uint256 id, address owner, string assetName, string description, uint256 assetValue, bool isActive, uint256 createdAt))",
  "function getRental(uint256 rentalId) view returns (tuple(uint256 id, uint256 listingId, address renter, address owner, uint256 depositPaid, uint256 platformFee, uint8 status, uint256 startedAt))",
  "function getRentalCount() view returns (uint256)",
  "function calculateDeposit(uint256 assetValue, uint256 trustScore) view returns (uint256 deposit, uint256 platformFee)",

  // ── Write Functions ────────────────────────────────────────────────────────
  "function createListing(string calldata assetName, string calldata description, uint256 assetValue) returns (uint256 listingId)",
  "function startRental(uint256 listingId) payable returns (uint256 rentalId)",
  "function completeRental(uint256 rentalId) returns (bool)",
  "function raiseDispute(uint256 rentalId) returns (bool)",
] as const;

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

export function getContractRead(provider: JsonRpcProvider): Contract {
  return new ethers.Contract(CONTRACT_ADDRESS, COLLATERAL_X_ABI, provider);
}

export function getContractWrite(signer: JsonRpcSigner): Contract {
  return new ethers.Contract(CONTRACT_ADDRESS, COLLATERAL_X_ABI, signer);
}
