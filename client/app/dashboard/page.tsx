// =============================================================================
// VeriFlow Protocol – Dashboard Overview Page (Premium UI)
// =============================================================================

"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { useWallet } from "@/hooks/useWallet";
import { useTrustScore } from "@/hooks/useTrustScore";
import { useListings } from "@/hooks/useListings";
import { useAppStore } from "@/store/useAppStore";
import { TrustScoreCard } from "@/components/trust/TrustScoreCard";
import { CreateListingForm } from "@/components/listings/CreateListingForm";
import { ListingGrid } from "@/components/listings/ListingGrid";
import {
  LayoutGrid,
  PackageSearch,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Activity,
  Zap,
  Star,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Info,
  Coins,
} from "lucide-react";

// ── Animation variants ──────────────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 24 } },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const tierConfig: Record<string, { label: string; color: string; savingsDesc: string }> = {
  Bronze: { label: "Bronze", color: "text-amber-400", savingsDesc: "Up to 30% deposit savings" },
  Silver: { label: "Silver", color: "text-zinc-300", savingsDesc: "Up to 60% deposit savings" },
  Gold:   { label: "Gold",   color: "text-yellow-400", savingsDesc: "Up to 80% deposit savings" },
};

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

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  trend,
  accent = "violet",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  trend?: { dir: "up" | "down" | "neutral"; text: string };
  accent?: "violet" | "emerald" | "amber" | "cyan";
}) {
  const accentMap = {
    violet: {
      bg: "from-violet-500/15 to-violet-600/5 border-violet-500/20",
      icon: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    },
    emerald: {
      bg: "from-emerald-500/15 to-emerald-600/5 border-emerald-500/20",
      icon: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    amber: {
      bg: "from-amber-500/15 to-amber-600/5 border-amber-500/20",
      icon: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    cyan: {
      bg: "from-cyan-500/15 to-cyan-600/5 border-cyan-500/20",
      icon: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    },
  }[accent];

  const trendColor =
    trend?.dir === "up"
      ? "text-emerald-400"
      : trend?.dir === "down"
      ? "text-red-400"
      : "text-white/30";
  const trendArrow = trend?.dir === "up" ? "↑" : trend?.dir === "down" ? "↓" : "·";

  return (
    <motion.div
      variants={itemVariants}
      className={`relative rounded-2xl border bg-gradient-to-br ${accentMap.bg} p-5 overflow-hidden group hover:scale-[1.01] transition-transform duration-200`}
    >
      <div className="absolute inset-0 bg-black/30 rounded-2xl" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-white/40">{label}</p>
          <p className="text-2xl font-black text-white">{value}</p>
          {sub && <p className="text-[11px] text-white/30">{sub}</p>}
          {trend && (
            <p className={`text-[11px] font-medium ${trendColor}`}>
              {trendArrow} {trend.text}
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${accentMap.icon} shrink-0`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

function QuickActionCard({
  href,
  icon,
  title,
  desc,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge?: string;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Link
        href={href}
        className="group flex items-center gap-3 p-3 rounded-2xl border border-white/8 bg-white/2 hover:bg-white/5 hover:border-violet-500/30 transition-all duration-200"
      >
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 group-hover:text-violet-400 group-hover:border-violet-500/30 group-hover:bg-violet-500/10 transition-all duration-200 shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">{title}</p>
            {badge && (
              <span className="px-1.5 py-0.5 rounded-md bg-violet-500/15 text-violet-400 text-[10px] font-bold border border-violet-500/20">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-white/40 truncate">{desc}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-violet-400 group-hover:translate-x-1 transition-all duration-200 shrink-0" />
      </Link>
    </motion.div>
  );
}

function ActivityItem({
  label,
  sub,
  amount,
  status,
  time,
}: {
  label: string;
  sub: string;
  amount: string;
  status: "Active" | "Completed" | "Disputed";
  time: string;
}) {
  const statusConfig = {
    Active: { icon: <Clock className="w-3.5 h-3.5" />, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
    Completed: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    Disputed: { icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "text-red-400 bg-red-500/10 border-red-500/20" },
  }[status];

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${statusConfig.color}`}>
        {statusConfig.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{label}</p>
        <p className="text-xs text-white/30 truncate">{sub}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-semibold text-white/80">{amount}</p>
        <p className="text-[10px] text-white/30">{time}</p>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { walletAddress, isConnected, shortAddress, isCheckingWallet } = useWallet();
  const { trustScore, trustTier, isLoading: scoreLoading } = useTrustScore(walletAddress);
  const { listings, isLoading: listingsLoading } = useListings();
  const { activeRentals } = useAppStore();

  const activeCount = activeRentals.filter((r) => r.status === "Active").length;
  const completedCount = activeRentals.filter((r) => r.status === "Completed").length;
  // Deposit saved stat: rough calculation – use trustScore % directly
  const depositSaved = `${trustScore}%`;
  const tierInfo = tierConfig[trustTier?.name ?? "Bronze"] ?? tierConfig.Bronze;

  // Show most recent 3 rentals in activity feed
  const recentRentals = activeRentals.slice(0, 3);

  // Redirect guard — wait until wallet check is done
  useEffect(() => {
    if (!isCheckingWallet && !isConnected) router.push("/");
  }, [isCheckingWallet, isConnected, router]);

  if (isCheckingWallet) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="min-h-[80vh] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8"
    >
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-white/40 font-medium mb-1">
            {isConnected ? `Signed in as ${shortAddress}` : "Guest Mode"}
          </p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Dashboard
          </h1>
          <p className="text-white/40 mt-1.5 text-base">
            Your collateral hub — manage listings, track rentals, build trust.
          </p>
        </div>

        {!isConnected && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Connect a wallet to interact with the protocol
          </div>
        )}
      </motion.div>

      {/* ── Protocol Stats Banner ─────────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-white/5 bg-white/2 px-4 py-3 flex flex-wrap items-center justify-center sm:justify-between gap-4 sm:gap-0"
      >
        {[
          { icon: <Zap className="w-3.5 h-3.5" />, label: "Verification Speed", value: "<3s", color: "text-violet-400" },
          { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: "Custodians", value: "0", color: "text-emerald-400" },
          { icon: <Coins className="w-3.5 h-3.5" />, label: "Platform Fee", value: "1%", color: "text-amber-400" },
          { icon: <Star className="w-3.5 h-3.5" />, label: "Max Savings", value: "80%", color: "text-cyan-400" },
          { icon: <Activity className="w-3.5 h-3.5" />, label: "Open Source", value: "100%", color: "text-indigo-400" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2 px-4 sm:border-r border-white/5 last:border-0">
            <span className={s.color}>{s.icon}</span>
            <div>
              <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-white/30">{s.label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Stats Bar ────────────────────────────────────────────────────── */}
      {/* (Active Rentals & Listings moved into left panel below Tier callout) */}

      {/* ── Main Grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left panel ─────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="space-y-5 h-min">

          {/* Trust Score Card */}
          <TrustScoreCard score={trustScore} tier={trustTier} isLoading={scoreLoading} />

          {/* Tier Benefit Callout */}
          {!scoreLoading && (
            <div className="flex items-start gap-3 rounded-xl border border-violet-500/15 bg-violet-500/5 px-4 py-3">
              <Info className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-violet-300">{tierInfo.label} Tier Active</p>
                <p className="text-xs text-white/40 mt-0.5">{tierInfo.savingsDesc} on any listing. Complete more rentals to unlock the next tier.</p>
              </div>
            </div>
          )}

          {/* Active Rentals & Listings stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<LayoutGrid className="w-5 h-5" />}
              label="Active Rentals"
              value={activeCount.toString()}
              sub="in progress"
              trend={activeCount > 0 ? { dir: "neutral", text: `${completedCount} done` } : undefined}
              accent="cyan"
            />
            <StatCard
              icon={<PackageSearch className="w-5 h-5" />}
              label="Listings"
              value={listingsLoading ? "—" : listings.length.toString()}
              sub="available"
              trend={!listingsLoading ? { dir: "neutral", text: "on market" } : undefined}
              accent="amber"
            />
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl border border-white/8 bg-white/2 p-4 space-y-2">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest px-1 mb-3">
              Quick Actions
            </p>
            <motion.div variants={containerVariants} className="space-y-2">
              <QuickActionCard
                href="/dashboard/listings"
                icon={<PackageSearch className="w-5 h-5" />}
                title="Browse Listings"
                desc="View all available assets to rent"
                badge={listingsLoading ? "…" : listings.length.toString()}
              />
              <QuickActionCard
                href="/dashboard/active"
                icon={<LayoutGrid className="w-5 h-5" />}
                title="My Rentals"
                desc="Track your active & past rentals"
                badge={activeCount > 0 ? activeCount.toString() : undefined}
              />
              <QuickActionCard
                href="/dashboard/my-listings"
                icon={<PackageSearch className="w-5 h-5" />}
                title="Owner Portal"
                desc="See who rented your items & manage them"
              />
              <QuickActionCard
                href="/dashboard/trust"
                icon={<ShieldCheck className="w-5 h-5" />}
                title="Trust Profile"
                desc="View your on-chain trust history"
              />
            </motion.div>
          </div>
        </motion.div>

        {/* ── Right panel ────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-5">

          {/* Create Listing — prominent at the top */}
          <CreateListingForm />

        </motion.div>
      </div>

      {/* ── Available Listings — Full Width ──────────────────────────────── */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Available Listings
            </h2>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20">
              {listingsLoading ? "…" : listings.length}
            </span>
          </div>
          <Link
            href="/dashboard/listings"
            className="flex items-center gap-1.5 text-sm font-medium text-white/40 hover:text-violet-300 transition-colors"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <ListingGrid
          listings={listings}
          trustScore={trustScore}
          isLoading={listingsLoading}
        />
      </motion.div>

      {/* ── Recent Activity Feed — Full Width ────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-white/8 bg-white/2 p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-bold text-white">Recent Activity</h3>
          </div>
          <Link
            href="/dashboard/active"
            className="text-xs text-white/40 hover:text-violet-300 transition-colors flex items-center gap-1"
          >
            All rentals <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentRentals.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-2xl mb-2">📋</p>
            <p className="text-sm text-white/30">No recent activity — start renting to see your history here.</p>
            <Link
              href="/dashboard/listings"
              className="mt-3 inline-block text-xs text-violet-400 hover:text-violet-300 underline underline-offset-4 transition-colors"
            >
              Browse listings →
            </Link>
          </div>
        ) : (
          <div>
            {recentRentals.map((r) => (
              <ActivityItem
                key={r.rentalId}
                label={r.assetName}
                sub={`Rental #${r.rentalId} · ${r.renter.slice(0, 6)}…${r.renter.slice(-4)}`}
                amount={`${r.depositPaid} ETH`}
                status={r.status}
                time={formatRelativeTime(r.startedAt)}
              />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
