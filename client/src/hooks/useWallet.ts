// =============================================================================
// VeriFlow Protocol – useWallet Hook
// =============================================================================

"use client";

import { useCallback, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { getBrowserProvider, shortenAddress } from "@/lib/ethers";

export function useWallet() {
  const {
    walletAddress,
    isConnecting,
    isCheckingWallet,
    setWallet,
    setConnecting,
    setCheckingWallet,
    addToast,
    reset,
  } = useAppStore();

  // ── Connect ────────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      if (typeof window === "undefined" || !window.ethereum) {
        throw new Error("MetaMask not detected. Please install it.");
      }
      const provider = getBrowserProvider();
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWallet(address);
      addToast({
        type: "success",
        message: `Connected: ${shortenAddress(address)}`,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to connect wallet";
      addToast({ type: "error", message: msg });
    } finally {
      setConnecting(false);
    }
  }, [setWallet, setConnecting, addToast]);

  // ── Disconnect (local only) ────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    reset();
    addToast({ type: "info", message: "Wallet disconnected." });
  }, [reset, addToast]);

  // ── Listen for account/chain changes ──────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) {
      setCheckingWallet(false);
      return;
    }

    const handleAccountChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        reset();
      } else {
        setWallet(accounts[0]);
      }
    };

    const eth = window.ethereum as any;

    eth.on("accountsChanged", handleAccountChanged);
    eth.on("chainChanged", () => window.location.reload());

    // Check if already connected — mark done regardless of outcome.
    // Both setWallet and setCheckingWallet live in Zustand so they trigger
    // a single synchronous re-render cycle (no race condition).
    getBrowserProvider()
      .listAccounts()
      .then((accounts) => {
        if (accounts.length > 0) {
          setWallet(accounts[0].address);
        }
      })
      .catch(() => {
        /* not connected yet */
      })
      .finally(() => {
        setCheckingWallet(false);
      });

    return () => {
      eth.removeListener("accountsChanged", handleAccountChanged);
    };
  }, [setWallet, setCheckingWallet, reset]);

  return {
    walletAddress,
    isConnecting,
    isCheckingWallet,
    isConnected: !!walletAddress,
    shortAddress: walletAddress ? shortenAddress(walletAddress) : null,
    connect,
    disconnect,
  };
}
