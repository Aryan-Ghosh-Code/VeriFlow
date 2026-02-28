// =============================================================================
// CollateralX Protocol – Navbar / Top Bar
// =============================================================================

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useTrustScore } from "@/hooks/useTrustScore";
import { WalletBadge } from "@/components/wallet/WalletBadge";
import { TierBadge } from "@/components/trust/TierBadge";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  LayoutGrid,
  PackageSearch,
  Activity,
  Github,
  Bell,
  Menu,
  X,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

const NAV_LINKS = [
  { href: "/dashboard",          label: "Overview",      icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  { href: "/dashboard/listings", label: "Listings",      icon: <PackageSearch className="w-3.5 h-3.5" /> },
  { href: "/dashboard/active",   label: "My Rentals",    icon: <Activity className="w-3.5 h-3.5" /> },
  { href: "/dashboard/trust",    label: "Trust",         icon: <ShieldCheck className="w-3.5 h-3.5" /> },
];

export function Navbar() {
  const pathname = usePathname();
  const { walletAddress, isConnected } = useWallet();
  const { trustScore, trustTier } = useTrustScore(walletAddress);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-soft)] bg-[var(--bg-elevated)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* ── Logo + Network badge ─────────────────────────────────────── */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-violet-900/40 group-hover:shadow-violet-600/50 transition-all duration-300 group-hover:scale-105">
              CX
            </div>
            <span className="font-semibold text-white hidden sm:block tracking-tight">
              CollateralX
            </span>
            {/* Testnet pill */}
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 tracking-wide">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
              </span>
              TESTNET
            </span>
          </Link>

          {/* ── Desktop Nav Links ────────────────────────────────────────── */}
          {isConnected && (
            <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
              {NAV_LINKS.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={[
                      "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                      active
                        ? "bg-violet-500/10 text-white border border-violet-500/20"
                        : "text-white/50 hover:text-white hover:bg-white/5",
                    ].join(" ")}
                  >
                    <span className={active ? "text-violet-400" : "text-white/30 group-hover:text-white/60 transition-colors"}>
                      {link.icon}
                    </span>
                    {link.label}
                    {active && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full bg-violet-500" />
                    )}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* ── Right: Actions ───────────────────────────────────────────── */}
          <div className="flex items-center gap-2 shrink-0">
            {/* GitHub */}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex w-8 h-8 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] items-center justify-center text-[var(--text-subtle)] hover:text-[var(--text-strong)] hover:bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all duration-200"
              title="GitHub"
            >
              <Github className="w-4 h-4" />
            </a>

            {/* Docs */}
            <a
              href="#"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] text-xs font-medium text-[var(--text-subtle)] hover:text-[var(--text-strong)] hover:bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all duration-200"
            >
              Docs <ExternalLink className="w-3 h-3" />
            </a>

            <ThemeToggle compact />

            {/* Notification bell */}
            {isConnected && (
              <button className="relative w-8 h-8 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] flex items-center justify-center text-[var(--text-subtle)] hover:text-[var(--text-strong)] hover:bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all duration-200">
                <Bell className="w-4 h-4" />
                {/* Unread dot */}
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-violet-500 ring-1 ring-[var(--bg)]" />
              </button>
            )}

            {/* Trust Tier badge */}
            {isConnected && (
              <TierBadge tier={trustTier} score={trustScore} compact />
            )}

            <WalletBadge />

            {/* Mobile hamburger */}
            {isConnected && (
              <button
                className="md:hidden w-8 h-8 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-strong)] transition-colors"
                onClick={() => setMobileOpen((v) => !v)}
              >
                {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile Nav Drawer ──────────────────────────────────────────────── */}
      {isConnected && mobileOpen && (
        <div className="md:hidden border-t border-[var(--border-soft)] bg-[var(--bg-elevated)] backdrop-blur-xl px-4 py-3 space-y-2">
          <div className="pb-2">
            <ThemeToggle />
          </div>
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  active
                    ? "bg-violet-500/10 text-white border border-violet-500/20"
                    : "text-white/50 hover:text-white hover:bg-white/5",
                ].join(" ")}
              >
                <span className={active ? "text-violet-400" : "text-white/30"}>
                  {link.icon}
                </span>
                {link.label}
              </Link>
            );
          })}
          <div className="flex items-center gap-3 pt-2 border-t border-white/5 mt-2">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors"
            >
              <Github className="w-3.5 h-3.5" /> GitHub
            </a>
            <a href="#" className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors">
              Docs <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
