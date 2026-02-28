// =============================================================================
// CollateralX Protocol – useListings Hook
// =============================================================================
// MongoDB is now the source of truth for listing metadata.
// Financial data (trust score, deposit, rental status) stays on-chain.
// =============================================================================

"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { genLocalId } from "@/lib/utils";
import type { Listing } from "@/types/rental";

export function useListings() {
  const { listings, setListings, addListingOptimistic, addToast } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);

  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/listings");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Listing[] = await res.json();
      setListings(data);
    } catch (err) {
      console.warn("[useListings] Failed to fetch from MongoDB:", err);
      // If DB is unreachable, show empty state rather than crashing
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  }, [setListings]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  /**
   * Optimistically add a listing to the UI before the POST response comes back.
   * Returns a temporary local ID so the caller can replace it after the API responds.
   */
  const optimisticAdd = useCallback(
    (data: { assetName: string; description: string; assetValue: string; owner: string; imageUrl?: string; category?: string; location?: string }) => {
      const listing: Listing = {
        id:          genLocalId(),
        owner:       data.owner,
        assetName:   data.assetName,
        description: data.description,
        assetValue:  data.assetValue,
        imageUrl:    data.imageUrl,
        location:    data.location,
        isActive:    true,
        createdAt:   Math.floor(Date.now() / 1000),
      };
      addListingOptimistic(listing);
      return listing.id;
    },
    [addListingOptimistic]
  );

  /**
   * Persist a new listing to MongoDB and return the saved listing.
   * Call this after a successful smart-contract transaction to record
   * the UI metadata in the database.
   */
  const saveListing = useCallback(
    async (data: {
      owner: string;
      assetName: string;
      description: string;
      assetValue: string;
      imageUrl?: string;
      category?: string;
      chainId?: string;
      location?: string;
    }): Promise<Listing> => {
      const res = await fetch("/api/listings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Failed to save listing (HTTP ${res.status})`);
      }
      return res.json();
    },
    []
  );

  /**
   * After a transaction confirms, patch the MongoDB document with the chainId
   * returned by the contract so it can be looked up by either ID.
   */
  const attachChainId = useCallback(
    async (mongoId: string, chainId: string) => {
      await fetch(`/api/listings/${mongoId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ chainId }),
      });
    },
    []
  );

  return {
    listings,
    isLoading,
    refetch:       fetchListings,
    optimisticAdd,
    saveListing,
    attachChainId,
    addToast,
  };
}
