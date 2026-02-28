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
  "event ListingCreated(uint256 id, address owner)",
  "event RentalStarted(uint256 id, address renter, uint256 collateral, uint256 duration, uint256 finalAmount)",
  "event RentalCompleted(uint256 id)",
  "event TrustUpdated(address user, uint256 score)",
  "event DisputeRaised(uint256 rentalId, address raisedBy, address accusedParty, uint8 severity)",
  "event DisputeResolved(uint256 rentalId, uint8 outcome, address penalisedParty, uint256 penaltyApplied)",

  // ── Read Functions ─────────────────────────────────────────────────────────
  "function listingCount() view returns (uint256)",
  "function rentalCount() view returns (uint256)",
  "function listings(uint256 id) view returns (uint256 id, address owner, string name, uint256 assetValue, bool active, uint256 minDuration, uint256 maxExtension, uint256 rentalFeePerDay, string ownerPhone)",
  "function rentals(uint256 id) view returns (uint256 id, uint256 listingId, address renter, uint256 collateral, uint256 finalAmount, uint256 startTime, uint256 endTime, uint256 duration, string renterPhone, uint8 status, bool finalPaid)",
  "function calculateDeposit(uint256 _value, uint256 _duration, address _user) view returns (uint256)",
  "function getUserProfile(address user) view returns (tuple(uint256 totalRentals, uint256 trustScore, uint256 disputesAgainst, uint256 disputesRaised, uint256 disputesLost, uint256 severeDisputes, uint256 rentalsAfterLastDispute, uint8 tier))",
  "function getOwnerProfile(address owner) view returns (tuple(uint256 totalListings, uint256 totalRentalsAsOwner, uint256 ownerScore, uint256 falseDisputesRaised))",
  "function contractBalance() view returns (uint256)",

  // ── Write Functions ────────────────────────────────────────────────────────
  "function createListing(string calldata _name, uint256 _value, uint256 _minDuration, uint256 _maxExtension, uint256 _rentalFeePerDay, string calldata _ownerPhone)",
  "function startRental(uint256 _listingId, uint256 _duration, string calldata _renterPhone) payable",
  "function extendRental(uint256 _rentalId, uint256 _extra)",
  "function payFinalAmount(uint256 _rentalId) payable",
  "function completeRental(uint256 _rentalId)",
  "function raiseDispute(uint256 _rentalId, uint8 _severity, string calldata _evidenceHash)",
  "function respondToDispute(uint256 _rentalId, string calldata _responseHash)",
  "function withdrawDispute(uint256 _rentalId)",
  "function resolveDispute(uint256 _rentalId, uint8 _outcome)",
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
