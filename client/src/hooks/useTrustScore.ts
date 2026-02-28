// =============================================================================
// CollateralX Protocol – useTrustScore Hook
// =============================================================================

"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { getReadProvider } from "@/lib/ethers";
import { getContractRead } from "@/lib/contract";
import { TRUST_SCORE_INITIAL } from "@/config";
import { getTrustTier } from "@/lib/utils";
import type { TrustTier } from "@/types/rental";

export function useTrustScore(walletAddress: string | null) {
  const { trustScore, trustTier, setTrustScore } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);

  const fetchScore = useCallback(async () => {
    if (!walletAddress) {
      setTrustScore(TRUST_SCORE_INITIAL);
      return;
    }
    setIsLoading(true);
    try {
      const provider = getReadProvider();
      const contract = getContractRead(provider);
      const raw: bigint = await contract.getTrustScore(walletAddress);
      setTrustScore(Number(raw));
    } catch {
      // Contract not deployed or network issue – use initial score
      setTrustScore(TRUST_SCORE_INITIAL);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, setTrustScore]);

  useEffect(() => {
    fetchScore();
  }, [fetchScore]);

  const tier: TrustTier = getTrustTier(trustScore);

  return {
    trustScore,
    trustTier: tier,
    isLoading,
    refetch: fetchScore,
  };
}
