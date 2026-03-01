// =============================================================================
// VeriFlow Protocol – Wallet Badge (header display)
// =============================================================================

"use client";

import React, { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/Button";

export function WalletBadge() {
  const { walletAddress, isConnected, isConnecting, connect, disconnect, shortAddress } = useWallet();
  const [open, setOpen] = useState(false);

  if (!isConnected) {
    return (
      <Button size="sm" onClick={connect} loading={isConnecting}>
        {isConnecting ? "Connecting…" : "Connect Wallet"}
      </Button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] hover:bg-[var(--surface)] transition-all text-sm text-[var(--text-muted)] hover:text-[var(--text-strong)]"
      >
        {/* Green dot */}
        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
        <span className="font-mono">{shortAddress}</span>
        <svg className="w-3 h-3 text-[var(--text-subtle)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-30 w-52 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] shadow-2xl shadow-black/35 overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-soft)]">
              <p className="text-xs text-[var(--text-subtle)] mb-1">Connected Wallet</p>
              <p className="text-xs font-mono text-[var(--text-strong)] break-all">{walletAddress}</p>
            </div>
            <button
              onClick={() => { setOpen(false); disconnect(); }}
              className="w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
            >
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}
