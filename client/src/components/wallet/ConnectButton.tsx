// =============================================================================
// CollateralX Protocol – Wallet Connect Button
// =============================================================================

"use client";

import React from "react";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/Button";

interface ConnectButtonProps {
  size?: "sm" | "md" | "lg";
}

export function ConnectButton({ size = "md" }: ConnectButtonProps) {
  const { connect, isConnecting, isConnected } = useWallet();

  if (isConnected) return null;

  return (
    <Button
      onClick={connect}
      loading={isConnecting}
      size={size}
      className="font-semibold tracking-wide"
    >
      {isConnecting ? "Connecting…" : "Connect Wallet"}
    </Button>
  );
}
