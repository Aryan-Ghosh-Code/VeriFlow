// =============================================================================
// VeriFlow Protocol – Ethers.js v6 helpers
// =============================================================================

import { ethers, BrowserProvider, JsonRpcSigner, JsonRpcProvider } from "ethers";
import { RPC_URL } from "@/config";

/** Return a read-only provider backed by the configured RPC URL */
export function getReadProvider(): JsonRpcProvider {
  return new JsonRpcProvider(RPC_URL);
}

/**
 * Return a BrowserProvider wrapping the injected MetaMask / EIP-1193 window.ethereum.
 * Throws when no provider is found so callers can surface the error to the user.
 */
export function getBrowserProvider(): BrowserProvider {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No Web3 wallet detected. Please install MetaMask.");
  }
  return new BrowserProvider(window.ethereum as any);
}

/** Request accounts and return a signer */
export async function getSigner(): Promise<JsonRpcSigner> {
  const provider = getBrowserProvider();
  await provider.send("eth_requestAccounts", []);
  return provider.getSigner();
}

/** Shorten an address to 0x1234…abcd */
export function shortenAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
