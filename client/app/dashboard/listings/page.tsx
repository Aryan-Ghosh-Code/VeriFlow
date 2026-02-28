// =============================================================================
// CollateralX Protocol – Listings Page (/dashboard/listings)
// =============================================================================

"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useTrustScore } from "@/hooks/useTrustScore";
import { useListings } from "@/hooks/useListings";
import { ListingGrid } from "@/components/listings/ListingGrid";
import { TierBadge } from "@/components/trust/TierBadge";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function ListingsPage() {
  const router = useRouter();
  const { walletAddress, isConnected, isCheckingWallet } = useWallet();
  const { trustScore, trustTier } = useTrustScore(walletAddress);
  const { listings, isLoading, refetch } = useListings();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isCheckingWallet && !isConnected) router.push("/");
  }, [isCheckingWallet, isConnected, router]);

  const filteredListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return listings;
    return listings.filter(
      (l) =>
        l.assetName.toLowerCase().includes(q) ||
        (l.location ?? "").toLowerCase().includes(q)
    );
  }, [listings, searchQuery]);

  if (isCheckingWallet || !isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Listings</h1>
          <p className="text-sm text-white/40 mt-1">
            Browse available assets for rental
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Trust badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/8 bg-white/3">
            <span className="text-xs text-white/40">Your Trust</span>
            <TierBadge tier={trustTier} score={trustScore} />
          </div>

          <Button size="sm" variant="secondary" onClick={refetch}>
            ↻ Refresh
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 px-5 py-3 flex items-center gap-3">
        <span className="text-violet-400 text-xl">💡</span>
        <p className="text-xs text-violet-300/80">
          Your dynamic deposit is calculated from your trust score. A score of{" "}
          <strong>{trustScore}</strong> saves you <strong>{trustScore}%</strong>{" "}
          off the base deposit on all listings.
        </p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-base pointer-events-none select-none">
          🔍
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by asset name or location…"
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors text-lg"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Result count */}
      {searchQuery && !isLoading && (
        <p className="text-xs text-white/40 -mt-2">
          {filteredListings.length === 0
            ? "No listings match your search."
            : `${filteredListings.length} listing${filteredListings.length !== 1 ? "s" : ""} found`}
        </p>
      )}

      {/* Listings grid */}
      <ListingGrid
        key={String(!!searchQuery)}
        listings={filteredListings}
        trustScore={trustScore}
        isLoading={isLoading}
      />
    </div>
  );
}
