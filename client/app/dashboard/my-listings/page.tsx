// =============================================================================
// CollateralX Protocol – Owner Portal (/dashboard/my-listings)
// Shows the listing owner all of their rented-out assets, renter info,
// status, and gives them the power to Complete or Raise Dispute.
// =============================================================================

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import {
  PackageCheck,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  PackageSearch,
  ChevronDown,
  ChevronUp,
  Wallet,
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useAppStore } from "@/store/useAppStore";
import { getReadProvider, getSigner } from "@/lib/ethers";
import { getContractRead, getContractWrite } from "@/lib/contract";
import { weiToEth, ethToInrStr, formatDate } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { RentalStatus } from "@/types/rental";

// ── Animation presets ───────────────────────────────────────────────────────

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 22 } },
};

// ── Types ───────────────────────────────────────────────────────────────────

interface OwnerRental {
  rentalId: string;
  listingId: string;
  assetName: string;
  location: string;
  ownerPhone: string;
  renter: string;
  renterPhone: string;
  depositPaid: string;      // ETH
  finalAmount: string;      // ETH
  finalPaid: boolean;
  status: RentalStatus;
  startedAt: number;
  endTime: number;
}

const STATUS_MAP: Record<number, RentalStatus> = {
  0: "Active",
  1: "Completed",
  2: "Disputed",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function shortAddr(addr: string) {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function timeLeft(endTime: number): string {
  const diff = endTime - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "Overdue";
  const days = Math.floor(diff / 86400);
  const hrs  = Math.floor((diff % 86400) / 3600);
  if (days > 0) return `${days}d ${hrs}h left`;
  const mins = Math.floor((diff % 3600) / 60);
  return `${hrs}h ${mins}m left`;
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatusChip({ status }: { status: RentalStatus }) {
  const cfg = {
    Active:    { cls: "text-cyan-400    border-cyan-500/30    bg-cyan-500/10",    dot: "bg-cyan-400",    label: "Active" },
    Completed: { cls: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", dot: "bg-emerald-400", label: "Completed" },
    Disputed:  { cls: "text-red-400     border-red-500/30     bg-red-500/10",     dot: "bg-red-400",    label: "Disputed" },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function DataRow({ label, value, mono = false, accent = false }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-[11px] text-white/35 shrink-0">{label}</span>
      <span className={`text-xs text-right truncate ${mono ? "font-mono" : "font-medium"} ${accent ? "text-violet-300" : "text-white/70"}`}>
        {value}
      </span>
    </div>
  );
}

function OwnerRentalCard({
  rental,
  onRefetch,
}: {
  rental: OwnerRental;
  onRefetch: () => void;
}) {
  const [completing,  setCompleting]  = useState(false);
  const [disputing,   setDisputing]   = useState(false);
  const [expanded,    setExpanded]    = useState(false);
  const { addToast, setPendingReceipt } = useAppStore();

  const isActive    = rental.status === "Active";
  const canComplete = isActive && rental.finalPaid;
  const depositInr  = ethToInrStr(parseFloat(rental.depositPaid));
  const feeInr      = ethToInrStr(parseFloat(rental.finalAmount));

  // ── Complete rental ──────────────────────────────────────────────────────
  const handleComplete = async () => {
    setCompleting(true);
    const tid = addToast({ type: "loading", message: "Completing rental…" });
    try {
      const signer   = await getSigner();
      const contract = getContractWrite(signer);
      const tx       = await contract.completeRental(rental.rentalId, { gasLimit: BigInt(300_000) });
      const receipt  = await tx.wait();
      useAppStore.getState().removeToast(tid);
      addToast({ type: "success", message: `✅ Rental #${rental.rentalId} marked complete. Collateral refunded to renter.` });
      setPendingReceipt({
        rentalId:       rental.rentalId,
        assetName:      rental.assetName,
        depositPaid:    rental.depositPaid,
        platformFee:    (parseFloat(rental.depositPaid) * 0.01).toFixed(6),
        refundedAmount: (parseFloat(rental.depositPaid) * 0.99).toFixed(6),
        txHash:         receipt?.hash ?? tx.hash,
        completedAt:    Math.floor(Date.now() / 1000),
      });
      onRefetch();
    } catch (err: unknown) {
      useAppStore.getState().removeToast(tid);
      addToast({ type: "error", message: err instanceof Error ? err.message : "Failed to complete" });
    } finally {
      setCompleting(false);
    }
  };

  // ── Raise dispute ────────────────────────────────────────────────────────
  const handleDispute = async () => {
    setDisputing(true);
    const tid = addToast({ type: "loading", message: "Raising dispute…" });
    try {
      const signer   = await getSigner();
      const contract = getContractWrite(signer);
      const tx = await contract.raiseDispute(
        rental.rentalId,
        2,   // Moderate by default
        "",  // evidence hash — IPFS in production
        { gasLimit: BigInt(300_000) },
      );
      await tx.wait();
      useAppStore.getState().removeToast(tid);
      addToast({ type: "success", message: `⚠️ Dispute raised for rental #${rental.rentalId}.` });
      onRefetch();
    } catch (err: unknown) {
      useAppStore.getState().removeToast(tid);
      addToast({ type: "error", message: err instanceof Error ? err.message : "Failed to raise dispute" });
    } finally {
      setDisputing(false);
    }
  };

  return (
    <motion.div
      variants={item}
      className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden hover:border-white/12 transition-colors duration-200"
    >
      {/* ── Card Header ──────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-white text-base leading-tight truncate">{rental.assetName}</p>
            <p className="text-[10px] text-white/30 mt-0.5 font-mono">Rental #{rental.rentalId} · Listing #{rental.listingId}</p>
          </div>
          <StatusChip status={rental.status} />
        </div>

        {/* Renter info */}
        <div className="flex items-center gap-2.5 rounded-xl border border-violet-500/15 bg-violet-500/5 px-3 py-2.5">
          <div className="w-8 h-8 rounded-full bg-violet-500/15 border border-violet-500/20 flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4 text-violet-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-white/35 uppercase tracking-wide">Rented By</p>
            <p className="text-sm font-semibold text-violet-300 font-mono truncate">{shortAddr(rental.renter)}</p>
          </div>
          {rental.renterPhone && (
            <div className="ml-auto flex items-center gap-1.5 text-xs text-white/40">
              <Phone className="w-3 h-3 text-violet-400/60 shrink-0" />
              <span>{rental.renterPhone}</span>
            </div>
          )}
        </div>

        {/* Finance summary */}
        <div className="rounded-xl bg-white/3 border border-white/5 px-3 py-2.5 space-y-1.5">
          <DataRow label="Security Deposit" value={`${depositInr}  (${rental.depositPaid} ETH)`} />
          <DataRow label="Rental Fee" value={rental.finalAmount !== "0" ? `${feeInr}  (${rental.finalAmount} ETH)` : "Not set"} />
          <div className="h-px bg-white/5 my-1" />
          <DataRow
            label="Fee status"
            value={rental.finalPaid ? "✅ Rental fee paid" : "⏳ Awaiting payment"}
            accent={rental.finalPaid}
          />
        </div>

        {/* Time info */}
        {isActive && (
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-white/35">
              <Clock className="w-3 h-3" />
              Started {formatDate(rental.startedAt)}
            </span>
            <span className={`font-medium ${rental.endTime < Date.now() / 1000 ? "text-red-400" : "text-amber-400"}`}>
              {timeLeft(rental.endTime)}
            </span>
          </div>
        )}
        {!isActive && rental.status === "Completed" && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400/70">
            <CheckCircle2 className="w-3 h-3" />
            Completed on {formatDate(rental.startedAt)}
          </div>
        )}
      </div>

      {/* ── Expand: more details ─────────────────────────────────────────── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-2 border-t border-white/5 text-[11px] text-white/30 hover:text-white/60 hover:bg-white/2 transition-colors"
      >
        <span>Location &amp; contact</span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="px-5 py-3 border-t border-white/5 space-y-2 bg-white/1">
          {rental.location && (
            <div className="flex items-start gap-2 text-xs text-white/50">
              <MapPin className="w-3.5 h-3.5 text-amber-400/70 mt-0.5 shrink-0" />
              <span>{rental.location}</span>
            </div>
          )}
          {rental.ownerPhone && (
            <div className="flex items-center gap-2 text-xs text-white/50">
              <Phone className="w-3.5 h-3.5 text-violet-400/70 shrink-0" />
              <span>Your listed phone: {rental.ownerPhone}</span>
            </div>
          )}
          <DataRow label="Renter address" value={rental.renter} mono />
        </div>
      )}

      {/* ── Owner Actions ────────────────────────────────────────────────── */}
      {isActive && (
        <div className="px-5 pb-5 pt-3 border-t border-white/5 grid grid-cols-2 gap-2.5">
          {/* Complete */}
          <button
            onClick={handleComplete}
            disabled={!canComplete || completing}
            className={[
              "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
              canComplete && !completing
                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-500/50 hover:shadow-[0_0_16px_rgba(16,185,129,0.15)]"
                : "bg-white/3 border border-white/8 text-white/20 cursor-not-allowed",
            ].join(" ")}
            title={!canComplete ? "Renter must pay the rental fee before you can close" : "Mark as complete & refund renter deposit"}
          >
            {completing ? (
              <span className="w-4 h-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            {completing ? "Closing…" : "Complete"}
          </button>

          {/* Raise Dispute */}
          <button
            onClick={handleDispute}
            disabled={disputing}
            className={[
              "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
              !disputing
                ? "bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 hover:shadow-[0_0_16px_rgba(239,68,68,0.12)]"
                : "bg-white/3 border border-white/8 text-white/20 cursor-not-allowed",
            ].join(" ")}
          >
            {disputing ? (
              <span className="w-4 h-4 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
            ) : (
              <ShieldAlert className="w-4 h-4 shrink-0" />
            )}
            {disputing ? "Raising…" : "Dispute"}
          </button>

          {/* Fee pending hint */}
          {!rental.finalPaid && (
            <p className="col-span-2 text-center text-[10px] text-amber-400/70">
              ⚠ Complete is locked until the renter pays the rental fee
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── Stat tile ───────────────────────────────────────────────────────────────

function StatTile({
  value, label, color = "default",
}: { value: string; label: string; color?: "default" | "cyan" | "emerald" | "red" | "amber" }) {
  const cls = {
    default: "text-white",
    cyan:    "text-cyan-400",
    emerald: "text-emerald-400",
    red:     "text-red-400",
    amber:   "text-amber-400",
  }[color];
  return (
    <div className="rounded-xl border border-white/5 bg-white/2 px-4 py-3 text-center">
      <p className={`text-xl font-black ${cls}`}>{value}</p>
      <p className="text-[11px] text-white/30 mt-0.5">{label}</p>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function OwnerPortalPage() {
  const router = useRouter();
  const { walletAddress, isConnected, isCheckingWallet, shortAddress } = useWallet();

  const [rentals,  setRentals]  = useState<OwnerRental[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<"All" | RentalStatus>("All");

  // ── Fetch all rentals owned by this wallet ──────────────────────────────
  const fetchMyRentals = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    const provider = getReadProvider();
    try {
      const contract  = getContractRead(provider);
      const count: bigint = await contract.rentalCount();
      const found: OwnerRental[] = [];

      for (let i = 1; i <= Number(count); i++) {
        // Fetch rental first
        const raw = await contract.rentals(i);
        const listingId = raw.listingId;

        // Fetch its listing to check ownership
        const listing = await contract.listings(listingId);
        if (listing.owner.toLowerCase() !== walletAddress.toLowerCase()) continue;

        const collEth  = weiToEth(raw.collateral);
        const finalEth = weiToEth(raw.finalAmount);

        found.push({
          rentalId:    raw.id.toString(),
          listingId:   listingId.toString(),
          assetName:   listing.name || `Listing #${listingId}`,
          location:    listing.location || "",
          ownerPhone:  listing.ownerPhone || "",
          renter:      raw.renter,
          renterPhone: raw.renterPhone || "",
          depositPaid: collEth.toString(),
          finalAmount: finalEth.toString(),
          finalPaid:   raw.finalPaid,
          status:      STATUS_MAP[raw.status] ?? "Active",
          startedAt:   Number(raw.startTime),
          endTime:     Number(raw.endTime),
        });
      }

      setRentals(found.reverse());
    } catch (e) {
      console.warn("[OwnerPortal] fetchMyRentals failed:", e);
    } finally {
      provider.destroy();
      setLoading(false);
    }
  }, [walletAddress]);

  // Redirect guard
  useEffect(() => {
    if (!isCheckingWallet && !isConnected) { router.push("/"); return; }
    if (isConnected) fetchMyRentals();
  }, [isCheckingWallet, isConnected, router, fetchMyRentals]);

  if (isCheckingWallet || !isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  // ── Filter logic ────────────────────────────────────────────────────────
  const displayed = filter === "All" ? rentals : rentals.filter((r) => r.status === filter);

  const counts = {
    total:     rentals.length,
    active:    rentals.filter((r) => r.status === "Active").length,
    completed: rentals.filter((r) => r.status === "Completed").length,
    disputed:  rentals.filter((r) => r.status === "Disputed").length,
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="min-h-[80vh] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-white/40 mb-1">Signed in as <span className="text-violet-300 font-mono">{shortAddress}</span></p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
            <PackageCheck className="w-8 h-8 text-violet-400" />
            My Owner Portal
          </h1>
          <p className="text-white/40 mt-1.5 text-sm">
            Every rental of your listings — who rented what, their status, and your controls.
          </p>
        </div>

        <button
          onClick={fetchMyRentals}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/3 hover:bg-white/6 transition-all text-sm text-white/60 hover:text-white disabled:opacity-40 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </motion.div>

      {/* ── Alert: owner-only controls ────────────────────────────────────── */}
      <motion.div
        variants={item}
        className="flex items-start gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/5 px-5 py-4"
      >
        <PackageCheck className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-violet-300">You are the owner — you control closure</p>
          <p className="text-xs text-white/40 mt-1">
            Only you can mark a rental as <strong className="text-white">Complete</strong> (product returned in good shape) or raise a
            <strong className="text-white"> Dispute</strong> (damage / non-return). The renter cannot close their own rental.
          </p>
        </div>
      </motion.div>

      {/* ── Stat Tiles ─────────────────────────────────────────────────────── */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile value={counts.total.toString()}     label="Total Rentals"    />
        <StatTile value={counts.active.toString()}    label="Active"    color="cyan" />
        <StatTile value={counts.completed.toString()} label="Completed" color="emerald" />
        <StatTile value={counts.disputed.toString()}  label="Disputed"  color="red" />
      </motion.div>

      {/* ── Filter Tabs ───────────────────────────────────────────────────── */}
      <motion.div variants={item}>
        <div className="flex items-center gap-2 flex-wrap">
          {(["All", "Active", "Completed", "Disputed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={[
                "px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150",
                filter === tab
                  ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                  : "bg-white/2 border-white/8 text-white/40 hover:border-white/20 hover:text-white/70",
              ].join(" ")}
            >
              {tab}
              {tab !== "All" && (
                <span className="ml-1.5 opacity-60">
                  ({counts[tab.toLowerCase() as keyof typeof counts] ?? 0})
                </span>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-24">
          <LoadingSpinner label="Loading your rentals from chain…" />
        </div>
      ) : displayed.length === 0 ? (
        <motion.div
          variants={item}
          className="flex flex-col items-center justify-center py-28 text-center space-y-4"
        >
          <div className="w-20 h-20 rounded-3xl bg-white/3 border border-white/8 flex items-center justify-center">
            <PackageSearch className="w-10 h-10 text-white/20" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white/60">
              {filter === "All" ? "No rentals yet" : `No ${filter.toLowerCase()} rentals`}
            </h3>
            <p className="text-sm text-white/30 max-w-xs">
              {filter === "All"
                ? "Once someone rents one of your listings, it'll appear here."
                : `You have no ${filter.toLowerCase()} rentals right now.`}
            </p>
          </div>
          {filter !== "All" && (
            <button
              onClick={() => setFilter("All")}
              className="text-sm text-violet-400 hover:text-violet-300 underline underline-offset-4 transition-colors"
            >
              View all rentals →
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
        >
          {displayed.map((rental) => (
            <OwnerRentalCard
              key={rental.rentalId}
              rental={rental}
              onRefetch={fetchMyRentals}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
