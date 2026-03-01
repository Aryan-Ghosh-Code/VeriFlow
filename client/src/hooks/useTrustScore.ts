// =============================================================================
// VeriFlow Protocol – useTrustScore Hook
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
    const provider = getReadProvider();
    try {
      const contract = getContractRead(provider);
      const profile = await contract.getUserProfile(walletAddress);
      // profile is a struct; trustScore is the second field
      const raw: bigint = profile.trustScore ?? profile[1] ?? BigInt(TRUST_SCORE_INITIAL);
      setTrustScore(Number(raw));
    } catch {
      // Contract not deployed or network issue – use initial score
      setTrustScore(TRUST_SCORE_INITIAL);
    } finally {
      // ⚠️ IMPORTANT: destroy the provider to stop its background blockNumber
      // polling loop. Without this, every mounted useTrustScore instance adds
      // a persistent poller that fires unrecognised eth_call selectors.
      provider.destroy();
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
