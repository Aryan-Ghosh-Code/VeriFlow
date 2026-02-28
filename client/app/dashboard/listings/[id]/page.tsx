// =============================================================================
// CollateralX Protocol – Listing Detail Page (/dashboard/listings/[id])
// =============================================================================

"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useTrustScore } from "@/hooks/useTrustScore";
import { useAppStore } from "@/store/useAppStore";
import { DepositBreakdown } from "@/components/rentals/DepositBreakdown";
import { TierBadge } from "@/components/trust/TierBadge";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getReadProvider, getSigner } from "@/lib/ethers";
import { getContractRead, getContractWrite } from "@/lib/contract";
import { calcDeposit, weiToEth, formatEth, genLocalId } from "@/lib/utils";
import { ethToWei } from "@/lib/utils";
import type { Listing, ActiveRental } from "@/types/rental";

interface RawListing {
  id: bigint;
  owner: string;
  name: string;        // Solidity field is 'name', not 'assetName'
  assetValue: bigint;
  active: boolean;     // Solidity field is 'active', not 'isActive'
  minDuration: bigint;
  maxExtension: bigint;
  rentalFeePerDay: bigint;
  ownerPhone: string;
}

// Demo listings for when contract is not deployed
const DEMO_LISTINGS: Listing[] = [
  {
    id: "0",
    owner: "0xDemo",
    assetName: "DJI Drone Pro Max",
    description:
      "Professional-grade drone with 4K camera. Available for shoots and surveying.",
    assetValue: "1.5",
    isActive: true,
    createdAt: 1700000000,
  },
  {
    id: "1",
    owner: "0xDemo",
    assetName: "Sony A7 III Camera",
    description:
      "Full-frame mirrorless camera. Includes 24-70mm lens, two batteries and bag.",
    assetValue: "0.8",
    isActive: true,
    createdAt: 1700010000,
  },
  {
    id: "2",
    owner: "0xDemo",
    assetName: "MacBook Pro M3",
    description:
      "16-inch MacBook Pro M3 Max. 36GB RAM, 1TB SSD. Perfect for creative work.",
    assetValue: "2.0",
    isActive: true,
    createdAt: 1700020000,
  },
];

export default function ListingDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { walletAddress, isConnected } = useWallet();
  const { trustScore, trustTier } = useTrustScore(walletAddress);
  const { addToast, addRentalOptimistic } = useAppStore();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [renting, setRenting] = useState(false);

  useEffect(() => {
    if (!isConnected) router.push("/");
  }, [isConnected, router]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Try store first
        const storeListings = useAppStore.getState().listings;
        const fromStore = storeListings.find((l) => l.id === params.id);
        if (fromStore) {
          setListing(fromStore);
          setLoading(false);
          return;
        }

        // Try contract — listings() is the public mapping accessor
        const provider = getReadProvider();
        try {
          const contract = getContractRead(provider);
          // params.id is the on-chain listingId (1-indexed)
          const raw: RawListing = await contract.listings(params.id);
          if (!raw.active) throw new Error("Listing not active");
          setListing({
            id: raw.id.toString(),
            owner: raw.owner,
            assetName: raw.name,
            description: "",   // description is off-chain (MongoDB only)
            assetValue: weiToEth(raw.assetValue).toString(),
            isActive: raw.active,
            createdAt: 0,
          });
        } finally {
          provider.destroy(); // Stop background polling
        }
      } catch {
        // Fall back to demo listings
        const demo = DEMO_LISTINGS.find((l) => l.id === params.id);
        setListing(demo ?? null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  if (!isConnected)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner label="Loading listing…" />
      </div>
    );

  if (!listing)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-6xl">🔍</p>
        <p className="text-white/60">Listing not found.</p>
        <Button onClick={() => router.back()} variant="secondary" size="sm">
          ← Go Back
        </Button>
      </div>
    );

  const assetValue = parseFloat(listing.assetValue);
  const { deposit, platformFee, refundable } = calcDeposit(
    assetValue,
    trustScore,
  );

  const handleStartRental = async () => {
    if (!walletAddress) return;
    setRenting(true);
    const tid = addToast({ type: "loading", message: "Starting rental…" });
    try {
      const signer = await getSigner();
      const contract = getContractWrite(signer);

      const depositWei = ethToWei(deposit);
      // startRental(listingId, duration, renterPhone)
      // Default to 7-day rental (604800 seconds)
      const DEFAULT_DURATION = BigInt(7 * 24 * 60 * 60);  // 7 days in seconds
      const tx = await contract.startRental(
        listing.id,
        DEFAULT_DURATION,
        "",   // renterPhone — empty for now
        { value: depositWei, gasLimit: BigInt(400_000) },
      );
      await tx.wait();

      useAppStore.getState().removeToast(tid);
      addToast({
        type: "success",
        message: `🎉 Rental started for ${listing.assetName}!`,
      });

      // Optimistic rental entry
      const newRental: ActiveRental = {
        rentalId: genLocalId(),
        listingId: listing.id,
        assetName: listing.assetName,
        renter: walletAddress,
        owner: listing.owner,
        depositPaid: deposit.toString(),
        platformFee: platformFee.toString(),
        refundable: refundable.toString(),
        status: "Active",
        startedAt: Math.floor(Date.now() / 1000),
        txHash: tx.hash,
      };
      addRentalOptimistic(newRental);

      router.push("/dashboard/active");
    } catch (err: unknown) {
      useAppStore.getState().removeToast(tid);
      addToast({
        type: "error",
        message: err instanceof Error ? err.message : "Transaction failed",
      });
    } finally {
      setRenting(false);
    }
  };

  return (
    <div className="min-h-[80vh] max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-white/40 hover:text-white mb-6 transition-colors"
      >
        ← Back to Listings
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Asset info */}
        <div className="space-y-6">
          {/* Image */}
          <div className="aspect-video rounded-2xl overflow-hidden border border-white/8 bg-gradient-to-br from-violet-900/20 to-indigo-900/10 flex items-center justify-center">
            {listing.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={listing.imageUrl}
                alt={listing.assetName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-7xl opacity-20">📦</span>
            )}
          </div>

          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold text-white">
                {listing.assetName}
              </h1>
              <Badge variant="green" dot>
                Active
              </Badge>
            </div>
            <p className="text-sm text-white/50 leading-relaxed">
              {listing.description || "No description provided."}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <InfoBox label="Asset Value" value={formatEth(assetValue)} />
              <InfoBox
                label="Owner"
                value={`${listing.owner.slice(0, 6)}…${listing.owner.slice(-4)}`}
                mono
              />
            </div>
          </div>
        </div>

        {/* Right: Trust + Deposit + CTA */}
        <div className="space-y-5">
          {/* Your trust score  */}
          <div className="rounded-2xl border border-white/8 bg-white/2 px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40">Your Trust Score</p>
              <p className="text-2xl font-bold text-white mt-0.5">
                {trustScore}
              </p>
            </div>
            <TierBadge tier={trustTier} score={trustScore} />
          </div>

          {/* Breakdown */}
          <DepositBreakdown
            assetValue={assetValue}
            trustScore={trustScore}
            deposit={deposit}
            platformFee={platformFee}
            refundable={refundable}
          />

          {/* CTA */}
          <Button
            onClick={handleStartRental}
            loading={renting}
            size="lg"
            className="w-full text-lg font-bold py-4"
          >
            {renting
              ? "Starting Rental…"
              : `🚀 Start Rental · ${formatEth(deposit)}`}
          </Button>

          <p className="text-[11px] text-center text-white/25">
            By starting a rental, you agree to the CollateralX protocol terms.
            Deposit is held by the smart contract.
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/3 border border-white/5 px-4 py-3">
      <p className="text-[10px] text-white/30 mb-1">{label}</p>
      <p
        className={[
          "text-sm font-semibold text-white/80",
          mono ? "font-mono" : "",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}
