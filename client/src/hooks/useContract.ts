// =============================================================================
// VeriFlow Protocol – useContract Hook
// =============================================================================

"use client";

import { useMemo } from "react";
import { JsonRpcProvider, JsonRpcSigner } from "ethers";
import { getContractRead, getContractWrite } from "@/lib/contract";
import { getReadProvider } from "@/lib/ethers";

/**
 * Returns contract instances for read (public RPC) and write (wallet signer).
 * Pass signer=null when no wallet is connected to get read-only access.
 */
export function useContract(signer: JsonRpcSigner | null = null) {
  const readProvider: JsonRpcProvider = useMemo(() => getReadProvider(), []);

  const readContract = useMemo(
    () => getContractRead(readProvider),
    [readProvider]
  );

  const writeContract = useMemo(
    () => (signer ? getContractWrite(signer) : null),
    [signer]
  );

  return { readContract, writeContract };
}
