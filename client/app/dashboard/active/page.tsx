// =============================================================================
// VeriFlow Protocol – Active Rentals Page (/dashboard/active)
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
  collateral: bigint;
  finalAmount: bigint;
  startTime: bigint;
  endTime: bigint;
  duration: bigint;
  renterPhone: string;
  status: number;
  finalPaid: boolean;
}

interface RawListing {
  id: bigint;
  owner: string;
  name: string;
  assetValue: bigint;
  active: boolean;
  minDuration: bigint;
  maxExtension: bigint;
  rentalFeePerDay: bigint;
  ownerPhone: string;
  location: string;
}

type TabId = "renter" | "owner";

export default function ActiveRentalsPage() {
  const router = useRouter();
  const { walletAddress, isConnected, isCheckingWallet } = useWallet();
  const { trustScore } = useTrustScore(walletAddress);
  const { activeRentals, setActiveRentals } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("renter");

  const fetchRentals = useCallback(async () => {
    setLoading(true);
    const provider = getReadProvider();
    try {
      const contract = getContractRead(provider);
      const count: bigint = await contract.rentalCount();
      const all: ActiveRental[] = [];
      const addr = walletAddress?.toLowerCase();

      for (let i = 1; i <= Number(count); i++) {
        const raw: RawRental = await contract.rentals(i);

        const isRenter = raw.renter.toLowerCase() === addr;

        // Resolve listing to get owner + phone
        let listing: RawListing | null = null;
        try { listing = await contract.listings(raw.listingId); } catch { /* silent */ }

        const isOwner = listing?.owner?.toLowerCase() === addr;

        // Skip if wallet is not involved in this rental
        if (!isRenter && !isOwner) continue;

        const collateralEth = weiToEth(raw.collateral);
        const finalAmtEth   = weiToEth(raw.finalAmount);
        const feeEth        = collateralEth * 0.01;
        const refundable    = collateralEth - feeEth;

        const assetName = listing?.name
          ? listing.name
          : `Listing #${raw.listingId.toString()}`;

        all.push({
          rentalId:    raw.id.toString(),
          listingId:   raw.listingId.toString(),
          assetName,
          renter:      raw.renter,
          owner:       listing?.owner ?? "",
          role:        isRenter ? "renter" : "owner",
          depositPaid: collateralEth.toString(),
          platformFee: feeEth.toFixed(6),
          refundable:  refundable.toFixed(6),
          finalAmount: finalAmtEth > 0 ? finalAmtEth.toString() : undefined,
          finalPaid:   raw.finalPaid,
          renterPhone: raw.renterPhone,
          ownerPhone:  listing?.ownerPhone,
          status:      STATUS_MAP[raw.status] ?? "Active",
          startedAt:   Number(raw.startTime),
          endTime:     Number(raw.endTime),
        });
      }

      setActiveRentals(all.reverse());
    } catch (e) {
      console.warn("[ActiveRentals] fetchRentals failed:", e);
    } finally {
      provider.destroy();
      setLoading(false);
    }
  }, [walletAddress, setActiveRentals]);

  useEffect(() => {
    if (!isCheckingWallet && !isConnected) { router.push("/"); return; }
    if (isConnected) fetchRentals();
  }, [isCheckingWallet, isConnected, router, fetchRentals]);

  if (isCheckingWallet || !isConnected)
    return <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner /></div>;

  const renterRentals = activeRentals.filter(r => r.role === "renter");
  const ownerRentals  = activeRentals.filter(r => r.role === "owner");
  const displayed     = activeTab === "renter" ? renterRentals : ownerRentals;

  return (
    <div className="min-h-[80vh] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Rentals</h1>
          <p className="text-sm text-white/40 mt-1">
            All rentals you are involved in
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

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl border border-white/8 bg-white/3 w-fit">
        {(["renter", "owner"] as TabId[]).map((tab) => {
          const count = tab === "renter" ? renterRentals.length : ownerRentals.length;
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                "relative px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                  : "text-white/40 hover:text-white/70",
              ].join(" ")}
            >
              {tab === "renter" ? "As Renter" : "As Owner"}
              {count > 0 && (
                <span
                  className={[
                    "ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                    isActive ? "bg-white/20 text-white" : "bg-white/8 text-white/40",
                  ].join(" ")}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner label="Loading rentals…" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
          <p className="text-6xl">{activeTab === "renter" ? "📋" : "🏷️"}</p>
          <h3 className="text-lg font-semibold text-white/70">
            {activeTab === "renter" ? "No rentals yet" : "No active listings rented out"}
          </h3>
          <p className="text-sm text-white/30 max-w-xs">
            {activeTab === "renter"
              ? "Start a rental from the listings page to see it here."
              : "When someone rents one of your listings, it will appear here."}
          </p>
          {activeTab === "renter" && (
            <button
              onClick={() => router.push("/dashboard/listings")}
              className="mt-2 text-sm text-violet-400 hover:text-violet-300 underline underline-offset-4 transition-colors"
            >
              Browse Listings →
            </button>
          )}
          {activeTab === "owner" && (
            <button
              onClick={() => router.push("/dashboard/my-listings")}
              className="mt-2 text-sm text-violet-400 hover:text-violet-300 underline underline-offset-4 transition-colors"
            >
              My Listings →
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <SummaryBox label="Total"     value={displayed.length.toString()} />
            <SummaryBox label="Active"    value={displayed.filter(r => r.status === "Active").length.toString()}    color="green" />
            <SummaryBox label="Disputed"  value={displayed.filter(r => r.status === "Disputed").length.toString()}  color="red" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayed.map((rental) => (
              <RentalCard
                key={`${rental.role}-${rental.rentalId}`}
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
