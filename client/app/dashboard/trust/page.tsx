// =============================================================================
// VeriFlow Protocol – Trust Profile Page (/dashboard/trust)
// =============================================================================
// On-chain source of truth: trust score + rental history from the contract.
// MongoDB (UI layer): purely display/metadata. No financial data here.
// =============================================================================

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { useWallet } from "@/hooks/useWallet";
import { useTrustScore } from "@/hooks/useTrustScore";
import { useAppStore } from "@/store/useAppStore";
import { TrustScoreCard } from "@/components/trust/TrustScoreCard";
import { TierBadge } from "@/components/trust/TierBadge";
import {
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  ArrowRight,
  Coins,
  Star,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { formatEth, calcDeposit } from "@/lib/utils";
import { TRUST_TIERS } from "@/config";

// ── Animation variants ────────────────────────────────────────────────────────

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 280, damping: 24 },
  },
};

// ── Tier configuration ────────────────────────────────────────────────────────

type TierName = "Bronze" | "Silver" | "Gold";

interface TierInfo {
  name: TierName;
  min: number;
  max: number;
  maxSavings: string;
  depositMultiplier: string;
  icon: string;
  gradient: string;
  border: string;
  glow: string;
  textColor: string;
  perks: string[];
}

const TIER_INFO: TierInfo[] = [
  {
    name: "Bronze",
    min: TRUST_TIERS.bronze.min,
    max: TRUST_TIERS.bronze.max,
    maxSavings: "30%",
    depositMultiplier: "up to 70% of asset value",
    icon: "🥉",
    gradient: "from-amber-900/30 to-amber-950/10",
    border: "border-amber-500/20",
    glow: "shadow-amber-900/20",
    textColor: "text-amber-400",
    perks: [
      "Up to 30% deposit reduction",
      "Instant wallet verification",
      "Access to all listings",
    ],
  },
  {
    name: "Silver",
    min: TRUST_TIERS.silver.min,
    max: TRUST_TIERS.silver.max,
    maxSavings: "60%",
    depositMultiplier: "up to 40% of asset value",
    icon: "🥈",
    gradient: "from-zinc-700/30 to-zinc-900/10",
    border: "border-zinc-400/20",
    glow: "shadow-zinc-700/20",
    textColor: "text-zinc-300",
    perks: [
      "Up to 60% deposit reduction",
      "Priority listing access",
      "Reduced platform visibility fees",
    ],
  },
  {
    name: "Gold",
    min: TRUST_TIERS.gold.min,
    max: TRUST_TIERS.gold.max,
    maxSavings: "80%",
    depositMultiplier: "as low as 20% of asset value",
    icon: "🥇",
    gradient: "from-yellow-900/30 to-yellow-950/10",
    border: "border-yellow-500/20",
    glow: "shadow-yellow-900/20",
    textColor: "text-yellow-400",
    perks: [
      "Up to 80% deposit reduction",
      "Gold badge on your profile",
      "Access to exclusive high-value listings",
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(startedAt: number): string {
  if (!startedAt) return "—";
  const diff = Date.now() - startedAt * 1000;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-4">
      {children}
    </p>
  );
}

function InfoRow({
  label,
  value,
  valueClass = "text-white",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-white/40">{label}</span>
      <span className={`text-xs font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TrustPage() {
  const router = useRouter();
  const { walletAddress, isConnected, shortAddress, isCheckingWallet } = useWallet();
  const { trustScore, trustTier, isLoading } = useTrustScore(walletAddress);
  const { activeRentals } = useAppStore();

  const completedRentals = activeRentals.filter(
    (r) => r.status === "Completed",
  );
  const disputedRentals = activeRentals.filter((r) => r.status === "Disputed");
  const activeCount = activeRentals.filter((r) => r.status === "Active").length;

  // Detect which tier the user is currently in
  const currentTierInfo =
    TIER_INFO.find((t) => t.name === (trustTier?.name ?? "Bronze")) ??
    TIER_INFO[0];

  // Next tier progress
  const nextTierInfo =
    TIER_INFO[
      TIER_INFO.findIndex((t) => t.name === currentTierInfo.name) + 1
    ] ?? null;
  const pointsToNext = nextTierInfo ? nextTierInfo.min - trustScore : 0;
  const rentalsToNext = Math.ceil(pointsToNext / 10); // +10 per rental

  // What a 1 ETH asset would cost at this trust score
  const sampleValue = 1.0;
  const { deposit: sampleDeposit } = calcDeposit(sampleValue, trustScore);

  //Redirect guard — wait until wallet check is done before redirecting
  useEffect(() => {
    if (!isCheckingWallet && !isConnected) router.push("/");
  }, [isCheckingWallet, isConnected, router]);

  if (isCheckingWallet || !isConnected) return null;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="min-h-[80vh] max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div
        variants={item}
        className="flex items-start justify-between flex-wrap gap-4"
      >
        <div>
          <p className="text-sm text-white/30 mb-1">{shortAddress}</p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Trust Profile
          </h1>
          <p className="text-white/40 mt-1 text-base">
            Your on-chain reputation — verified by the protocol, not by us.
          </p>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-semibold">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          Score read from chain
        </div>
      </motion.div>

      {/* ── Main Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column ──────────────────────────────────────────────────── */}
        <motion.div variants={item} className="space-y-5 h-fit">
          {/* Score card */}
          <TrustScoreCard
            score={trustScore}
            tier={trustTier}
            isLoading={isLoading}
          />

          {/* Savings preview */}
          <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-white/5 to-white/[0.02] p-5 space-y-4">
            <SectionLabel>Live Savings Preview</SectionLabel>
            <div className="flex items-end justify-between">
              <div className="space-y-1">
                <p className="text-[10px] text-white/30 uppercase tracking-tight">
                  Base deposit
                </p>
                <p className="text-lg text-white/40 line-through font-medium">
                  {formatEth(1.0, 2)}
                </p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-[10px] text-white/30 uppercase tracking-tight">
                  Your deposit
                </p>
                <div className="flex items-center gap-2 justify-end">
                  <p className="text-3xl font-black text-emerald-400">
                    {formatEth(sampleDeposit, 2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-3 rounded-full bg-white/5 p-0.5 overflow-hidden border border-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${100 - trustScore}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-400"
                />
              </div>
              <div className="flex justify-between items-center text-[10px] font-medium">
                <span className="text-emerald-400/80">
                  You save {trustScore}%
                </span>
                <span className="text-white/20">vs. network base</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <SectionLabel>Rental Analytics</SectionLabel>
            <div className="space-y-1">
              <InfoRow
                label="Total Rentals"
                value={(
                  completedRentals.length +
                  disputedRentals.length +
                  activeCount
                ).toString()}
              />
              <InfoRow
                label="Completed"
                value={completedRentals.length.toString()}
                valueClass="text-emerald-400"
              />
              <InfoRow
                label="Current Active"
                value={activeCount.toString()}
                valueClass="text-cyan-400"
              />
              <InfoRow
                label="Protocol Disputes"
                value={disputedRentals.length.toString()}
                valueClass={
                  disputedRentals.length > 0 ? "text-red-400" : "text-white/40"
                }
              />
              <div className="my-2 border-t border-white/5" />
              <InfoRow
                label="Reputation Gain"
                value={`+${completedRentals.length * 10} pts`}
                valueClass="text-violet-300"
              />
              <InfoRow
                label="Penalty Loss"
                value={
                  disputedRentals.length > 0
                    ? `−${disputedRentals.length * 20} pts`
                    : "0 pts"
                }
                valueClass={
                  disputedRentals.length > 0 ? "text-red-400" : "text-white/20"
                }
              />
            </div>
          </div>
        </motion.div>

        {/* ── Right column (spans 2) ────────────────────────────────────────── */}
        <motion.div variants={item} className="lg:col-span-2 space-y-6 h-fit">
          {/* ── Tier Roadmap ───────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-white/8 bg-white/2 p-5">
            <SectionLabel>Tier Roadmap</SectionLabel>
            <div className="space-y-3">
              {TIER_INFO.map((t) => {
                const isCurrent = t.name === currentTierInfo.name;
                const isUnlocked = trustScore >= t.min;
                const progress = isCurrent
                  ? Math.min(
                      100,
                      ((trustScore - t.min) / (t.max - t.min + 1)) * 100,
                    )
                  : isUnlocked
                    ? 100
                    : 0;

                return (
                  <div
                    key={t.name}
                    className={`relative rounded-2xl border p-4 transition-all duration-300 ${
                      isCurrent
                        ? `${t.gradient} ${t.border} shadow-xl ${t.glow}`
                        : isUnlocked
                          ? "bg-white/3 border-white/10"
                          : "bg-white/[0.01] border-white/5 opacity-50"
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/60 border border-white/10">
                        CURRENT
                      </span>
                    )}

                    <div className="flex items-start gap-4">
                      <span className="text-3xl leading-none mt-0.5">
                        {t.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`text-base font-bold ${t.textColor}`}>
                            {t.name}
                          </h3>
                          <span className="text-xs text-white/30">
                            {t.min}–{t.max} pts
                          </span>
                        </div>
                        <p className="text-xs text-white/40 mb-3">
                          Deposit {t.depositMultiplier} · Max {t.maxSavings}{" "}
                          savings
                        </p>

                        {/* Progress bar (only for current tier) */}
                        {isCurrent && (
                          <div className="mb-3">
                            <div className="flex justify-between text-[10px] text-white/30 mb-1">
                              <span>{t.min} pts</span>
                              <span>{trustScore} pts</span>
                              <span>{t.max} pts</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{
                                  duration: 1,
                                  delay: 0.3,
                                  ease: "easeOut",
                                }}
                                className={`h-full rounded-full bg-gradient-to-r ${
                                  t.name === "Bronze"
                                    ? "from-amber-500 to-orange-400"
                                    : t.name === "Silver"
                                      ? "from-zinc-400 to-slate-300"
                                      : "from-yellow-400 to-amber-300"
                                }`}
                              />
                            </div>
                          </div>
                        )}

                        {/* Perks */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {t.perks.map((perk) => (
                            <div
                              key={perk}
                              className="flex items-center gap-1.5"
                            >
                              <CheckCircle2
                                className={`w-3 h-3 ${isUnlocked ? t.textColor : "text-white/20"}`}
                              />
                              <span
                                className={`text-[11px] ${isUnlocked ? "text-white/60" : "text-white/20"}`}
                              >
                                {perk}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Next tier CTA */}
            {nextTierInfo && !isLoading && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-violet-500/15 bg-violet-500/5 px-4 py-3">
                <Zap className="w-4 h-4 text-violet-400 shrink-0" />
                <p className="text-xs text-white/60 flex-1">
                  <span className="text-violet-300 font-semibold">
                    {pointsToNext} pts
                  </span>{" "}
                  to {nextTierInfo.name} tier — complete{" "}
                  <span className="text-violet-300 font-semibold">
                    {rentalsToNext} more rental{rentalsToNext !== 1 ? "s" : ""}
                  </span>{" "}
                  to unlock {nextTierInfo.maxSavings} max savings.
                </p>
                <Link href="/dashboard/listings" className="shrink-0">
                  <ArrowRight className="w-4 h-4 text-violet-400 hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            )}
            {!nextTierInfo && !isLoading && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-yellow-500/15 bg-yellow-500/5 px-4 py-3">
                <Star className="w-4 h-4 text-yellow-400 shrink-0" />
                <p className="text-xs text-yellow-300 font-semibold">
                  🥇 You&apos;ve reached the highest tier — Gold. You&apos;re
                  saving up to 80% on every rental.
                </p>
              </div>
            )}
          </div>

          {/* ── How Trust Score Works ──────────────────────────────────────── */}
          <div className="rounded-2xl border border-white/8 bg-white/2 p-5">
            <SectionLabel>How Trust Score Works</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
                  title: "+10 pts",
                  sub: "Per completed rental",
                  desc: "Every successful return is recorded on-chain and grows your score.",
                  border: "border-emerald-500/15 bg-emerald-500/5",
                },
                {
                  icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
                  title: "−20 pts",
                  sub: "Per opened dispute",
                  desc: "Disputes reduce your score. Returning items on time avoids this.",
                  border: "border-red-500/15 bg-red-500/5",
                },
                {
                  icon: <ShieldCheck className="w-5 h-5 text-violet-400" />,
                  title: "On-chain",
                  sub: "Immutable & portable",
                  desc: "Your score is stored in the smart contract — no one can alter it.",
                  border: "border-violet-500/15 bg-violet-500/5",
                },
              ].map((rule) => (
                <div
                  key={rule.title}
                  className={`rounded-xl border p-4 ${rule.border}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {rule.icon}
                    <div>
                      <p className="text-sm font-bold text-white">
                        {rule.title}
                      </p>
                      <p className="text-[10px] text-white/40">{rule.sub}</p>
                    </div>
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed">
                    {rule.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Rental History ─────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-white/8 bg-white/2 p-5">
            <div className="flex items-center justify-between mb-4">
              <SectionLabel>Rental History</SectionLabel>
              <Link
                href="/dashboard/active"
                className="flex items-center gap-1 text-xs text-white/30 hover:text-violet-300 transition-colors"
              >
                All rentals <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {activeRentals.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-3xl mb-3">📋</p>
                <p className="text-sm text-white/30 mb-1">
                  No rental history yet
                </p>
                <p className="text-xs text-white/20">
                  Complete your first rental to start building on-chain trust.
                </p>
                <Link
                  href="/dashboard/listings"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 underline underline-offset-4 transition-colors"
                >
                  Browse listings <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div className="space-y-0">
                {activeRentals.map((r) => {
                  const statusIcon =
                    r.status === "Completed" ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : r.status === "Disputed" ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    );

                  const statusColor =
                    r.status === "Completed"
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      : r.status === "Disputed"
                        ? "text-red-400 bg-red-500/10 border-red-500/20"
                        : "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";

                  const trustDelta =
                    r.status === "Completed"
                      ? "+10 pts"
                      : r.status === "Disputed"
                        ? "−20 pts"
                        : "Active";

                  const deltaColor =
                    r.status === "Completed"
                      ? "text-emerald-400"
                      : r.status === "Disputed"
                        ? "text-red-400"
                        : "text-cyan-400";

                  return (
                    <div
                      key={r.rentalId}
                      className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0"
                    >
                      <div
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${statusColor}`}
                      >
                        {statusIcon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {r.assetName}
                        </p>
                        <p className="text-[10px] text-white/30">
                          {r.renter.slice(0, 6)}…{r.renter.slice(-4)} ·{" "}
                          {formatRelativeTime(r.startedAt)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold text-white/70">
                          {r.depositPaid} ETH
                        </p>
                        <p
                          className={`text-[10px] font-semibold ${deltaColor}`}
                        >
                          {trustDelta}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Compare to Network ─────────────────────────────────────────── */}
          <div className="rounded-2xl border border-white/8 bg-white/2 p-5">
            <SectionLabel>Protocol Context</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  icon: <Coins className="w-4 h-4" />,
                  label: "Platform Fee",
                  value: "1%",
                  color: "text-amber-400",
                },
                {
                  icon: <Zap className="w-4 h-4" />,
                  label: "Verification",
                  value: "<3s",
                  color: "text-violet-400",
                },
                {
                  icon: <TrendingUp className="w-4 h-4" />,
                  label: "Your Savings",
                  value: `${trustScore}%`,
                  color: "text-emerald-400",
                },
                {
                  icon: <ShieldCheck className="w-4 h-4" />,
                  label: "Custodians",
                  value: "0",
                  color: "text-cyan-400",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl bg-white/3 border border-white/5 px-3 py-3 text-center"
                >
                  <div className={`flex justify-center mb-1.5 ${s.color}`}>
                    {s.icon}
                  </div>
                  <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
