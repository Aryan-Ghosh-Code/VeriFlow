// =============================================================================
// CollateralX Protocol – Active Rentals Page (/dashboard/active)
// =============================================================================

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useTrustScore } from "@/hooks/useTrustScore";
import { useAppStore } from "@/store/useAppStore";
import { RentalCard } from "@/components/rentals/RentalCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getReadProvider } from "@/lib/ethers";
import { getContractRead } from "@/lib/contract";
import { weiToEth } from "@/lib/utils";
import type { ActiveRental, RentalStatus } from "@/types/rental";

const STATUS_MAP: Record<number, RentalStatus> = {
  0: "Active",
  1: "Completed",
  2: "Disputed",
};

interface RawRental {
  id: bigint;
  listingId: bigint;
  renter: string;
  owner: string;
  depositPaid: bigint;
  platformFee: bigint;
  status: number;
  startedAt: bigint;
}

export default function ActiveRentalsPage() {
  const router = useRouter();
  const { walletAddress, isConnected, isCheckingWallet } = useWallet();
  const { trustScore } = useTrustScore(walletAddress);
  const { activeRentals, setActiveRentals } = useAppStore();

  const [loading, setLoading] = useState(true);

  const fetchRentals = useCallback(async () => {
    setLoading(true);
    try {
      const provider = getReadProvider();
      const contract = getContractRead(provider);
      const count: bigint = await contract.getRentalCount();
      const all: ActiveRental[] = [];

      for (let i = 0; i < Number(count); i++) {
        const raw: RawRental = await contract.getRental(i);
        const addr = walletAddress?.toLowerCase();
        // Only show rentals where user is renter or owner
        if (
          raw.renter.toLowerCase() !== addr &&
          raw.owner.toLowerCase()  !== addr
        ) continue;

        const depositEth  = weiToEth(raw.depositPaid);
        const feeEth      = weiToEth(raw.platformFee);
        const refundable  = depositEth - feeEth;

        all.push({
          rentalId:    raw.id.toString(),
          listingId:   raw.listingId.toString(),
          assetName:   `Listing #${raw.listingId.toString()}`,
          renter:      raw.renter,
          owner:       raw.owner,
          depositPaid: depositEth.toString(),
          platformFee: feeEth.toString(),
          refundable:  refundable.toString(),
          status:      STATUS_MAP[raw.status] ?? "Active",
          startedAt:   Number(raw.startedAt),
        });
      }

      setActiveRentals(all.reverse());
    } catch {
      // Keep optimistic data already in store
    } finally {
      setLoading(false);
    }
  }, [walletAddress, setActiveRentals]);

  // Redirect guard — wait until wallet check is done
  useEffect(() => {
    if (!isCheckingWallet && !isConnected) { router.push("/"); return; }
    if (isConnected) fetchRentals();
  }, [isCheckingWallet, isConnected, router, fetchRentals]);

  if (isCheckingWallet || !isConnected) return <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner /></div>;

  return (
    <div className="min-h-[80vh] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Rentals</h1>
          <p className="text-sm text-white/40 mt-1">
            All rentals where you are the renter or owner
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-white/40">
          <span>Trust Score: <strong className="text-white">{trustScore}</strong></span>
          <button
            onClick={fetchRentals}
            className="px-3 py-1.5 rounded-lg border border-white/8 bg-white/3 hover:bg-white/6 transition-all text-xs text-white/60 hover:text-white"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner label="Loading rentals…" />
        </div>
      ) : activeRentals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
          <p className="text-6xl">📋</p>
          <h3 className="text-lg font-semibold text-white/70">No rentals yet</h3>
          <p className="text-sm text-white/30 max-w-xs">
            Start a rental from the listings page to see it here.
          </p>
          <button
            onClick={() => router.push("/dashboard/listings")}
            className="mt-2 text-sm text-violet-400 hover:text-violet-300 underline underline-offset-4 transition-colors"
          >
            Browse Listings →
          </button>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryBox label="Total"     value={activeRentals.length.toString()} />
            <SummaryBox label="Active"    value={activeRentals.filter(r => r.status === "Active").length.toString()}    color="green" />
            <SummaryBox label="Completed" value={activeRentals.filter(r => r.status === "Completed").length.toString()} color="violet" />
            <SummaryBox label="Disputed"  value={activeRentals.filter(r => r.status === "Disputed").length.toString()}  color="red" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeRentals.map((rental) => (
              <RentalCard
                key={rental.rentalId}
                rental={rental}
                currentWallet={walletAddress ?? ""}
                onRefetch={fetchRentals}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryBox({
  label,
  value,
  color = "default",
}: {
  label: string;
  value: string;
  color?: "default" | "green" | "violet" | "red";
}) {
  const textColor = {
    default: "text-white",
    green:   "text-emerald-400",
    violet:  "text-violet-400",
    red:     "text-red-400",
  }[color];

  return (
    <div className="rounded-xl border border-white/5 bg-white/2 px-4 py-3 text-center">
      <p className={["text-xl font-bold", textColor].join(" ")}>{value}</p>
      <p className="text-[11px] text-white/30 mt-0.5">{label}</p>
    </div>
  );
}
