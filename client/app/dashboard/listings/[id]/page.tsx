// =============================================================================
// CollateralX Protocol – Listing Detail Page (/dashboard/listings/[id])
// =============================================================================
// Workflow:
//   1. Load listing from store or on-chain
//   2. Show asset details + owner location/phone (for coordination)
//   3. Renter fills: phone number + duration
//   4. Live INR deposit preview updates as they type
//   5. "Start Rental" calls startRental() on-chain with collateral value
// =============================================================================

"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { MapPin, Phone, Clock, Shield, ChevronLeft, Calendar } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useTrustScore } from "@/hooks/useTrustScore";
import { useAppStore } from "@/store/useAppStore";
import { TierBadge } from "@/components/trust/TierBadge";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getReadProvider, getSigner } from "@/lib/ethers";
import { getContractRead, getContractWrite } from "@/lib/contract";
import { calcDeposit, weiToEth, ethToInrStr, ethToInr, formatInr, genLocalId } from "@/lib/utils";
import { ethToWei } from "@/lib/utils";
import { ETH_TO_INR } from "@/config";
import type { Listing, ActiveRental } from "@/types/rental";

interface RawListing {
  id: bigint;
  owner: string;
  name: string;
  assetValue: bigint;
  active: boolean;
  minDuration: bigint;
  maxExtension: bigint;
  rentalFeePerDay: bigint;
  ownerPhone: string;
  location: string;
}

const DEMO_LISTINGS: Listing[] = [
  {
    id: "0", owner: "0xDemo",
    assetName: "DJI Drone Pro Max",
    description: "Professional-grade drone with 4K camera. Available for shoots and surveying.",
    assetValue: "1.5", isActive: true, createdAt: 1700000000,
    location: "Connaught Place, New Delhi",
  },
  {
    id: "1", owner: "0xDemo",
    assetName: "Sony A7 III Camera",
    description: "Full-frame mirrorless camera. Includes 24-70mm lens, two batteries and bag.",
    assetValue: "0.8", isActive: true, createdAt: 1700010000,
    location: "Bandra West, Mumbai",
  },
  {
    id: "2", owner: "0xDemo",
    assetName: "MacBook Pro M3",
    description: "16-inch MacBook Pro M3 Max. 36GB RAM, 1TB SSD. Perfect for creative work.",
    assetValue: "2.0", isActive: true, createdAt: 1700020000,
    location: "Koramangala, Bengaluru",
  },
];

const inputCls =
  "w-full rounded-xl bg-white/5 border border-white/10 text-white text-sm px-3.5 py-2.5 placeholder:text-white/25 focus:outline-none focus:border-violet-500/60 focus:bg-violet-500/5 transition-all";

export default function ListingDetailPage() {
  const router  = useRouter();
  const params  = useParams<{ id: string }>();
  const { walletAddress, isConnected } = useWallet();
  const { trustScore, trustTier }      = useTrustScore(walletAddress);
  const { addToast, addRentalOptimistic } = useAppStore();

  const [listing,  setListing]  = useState<Listing | null>(null);
  const [rawOnChain, setRawOnChain] = useState<Pick<RawListing, "ownerPhone" | "location" | "rentalFeePerDay" | "minDuration"> | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [renting,  setRenting]  = useState(false);

  // ── Rental form state ──────────────────────────────────────────────────────
  const [phone,    setPhone]    = useState("");
  const [duration, setDuration] = useState("7");   // days

  useEffect(() => {
    if (!isConnected) router.push("/");
  }, [isConnected, router]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // 1. Look up listing in store by MongoDB _id OR chainId
        const storeListings = useAppStore.getState().listings;
        const fromStore = storeListings.find(
          (l) => l.id === params.id || l.chainId === params.id
        );
        if (fromStore) setListing(fromStore);

        // 2. Derive a valid uint256 on-chain ID.
        //    - Prefer fromStore.chainId (set after tx confirmed).
        //    - Fall back to params.id ONLY if it is a plain integer.
        //    - Never pass a MongoDB hex ObjectId to the contract.
        const onChainId: string | null =
          fromStore?.chainId ??
          (/^\d+$/.test(params.id) ? params.id : null);

        if (!onChainId) return;  // not on-chain yet — show metadata only

        // 2. Always fetch from contract to get ownerPhone, location, fees
        const provider = getReadProvider();
        try {
          const contract = getContractRead(provider);
          const raw: RawListing = await contract.listings(onChainId);
          if (!raw.active) throw new Error("Listing not active");

          setRawOnChain({
            ownerPhone:     raw.ownerPhone,
            location:       raw.location,
            rentalFeePerDay: raw.rentalFeePerDay,
            minDuration:    raw.minDuration,
          });

          // If we didn't find it in the store, build from on-chain data
          if (!fromStore) {
            setListing({
              id:          params.id,
              chainId:     onChainId,
              owner:       raw.owner,
              assetName:   raw.name,
              description: "",
              assetValue:  weiToEth(raw.assetValue).toString(),
              isActive:    raw.active,
              createdAt:   0,
              location:    raw.location,
            });
          }

          // Set default duration to minDuration (in days, at least 1)
          const minDays = Math.max(1, Math.ceil(Number(raw.minDuration) / 86400));
          setDuration(String(minDays));
        } finally {
          provider.destroy();
        }
      } catch {
        const demo = DEMO_LISTINGS.find((l) => l.id === params.id);
        if (demo) setListing(demo);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  if (!isConnected) return <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner /></div>;
  if (loading)      return <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner label="Loading listing…" /></div>;
  if (!listing)     return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-6xl">🔍</p>
      <p className="text-white/60">Listing not found.</p>
      <Button onClick={() => router.back()} variant="secondary" size="sm">← Go Back</Button>
    </div>
  );

  const isOwner    = walletAddress?.toLowerCase() === listing.owner.toLowerCase();
  const assetValue = parseFloat(listing.assetValue);
  const durationDays = Math.max(1, parseInt(duration) || 1);
  const durationSecs = durationDays * 86400;

  // On-chain ID for rental submission
  const onChainId = listing.chainId ?? (/^\d+$/.test(params.id) ? params.id : null);

  // Live deposit calculation (uses trust score + duration for surcharge)
  const { deposit, platformFee, refundable } = calcDeposit(assetValue, trustScore, durationSecs);

  // Daily fee
  const feePerDayEth = rawOnChain
    ? weiToEth(rawOnChain.rentalFeePerDay)
    : 0;
  const totalFeeEth  = feePerDayEth * durationDays;

  // INR equivalents
  const depositInr    = ethToInrStr(deposit);
  const refundableInr = ethToInrStr(refundable);
  const dailyFeeInr   = ethToInrStr(feePerDayEth);
  const totalFeeInr   = ethToInrStr(totalFeeEth);

  const handleStartRental = async () => {
    if (!walletAddress) return;
    if (!phone.trim()) return addToast({ type: "error", message: "Please enter your phone number for coordination." });
    if (!onChainId) return addToast({ type: "error", message: "This listing has not been confirmed on-chain yet." });

    setRenting(true);
    const tid = addToast({ type: "loading", message: "Starting rental…" });
    try {
      const signer   = await getSigner();
      const contract = getContractWrite(signer);
      const depositWei = ethToWei(deposit);

      const tx = await contract.startRental(
        onChainId,           // ← always the uint256 on-chain listing ID
        BigInt(durationSecs),
        phone.trim(),
        { value: depositWei, gasLimit: BigInt(400_000) },
      );
      await tx.wait();

      useAppStore.getState().removeToast(tid);
      addToast({ type: "success", message: `🎉 Rental started for ${listing.assetName}!` });

      const newRental: ActiveRental = {
        rentalId:    genLocalId(),
        listingId:   listing.id,
        assetName:   listing.assetName,
        renter:      walletAddress,
        owner:       listing.owner,
        depositPaid: deposit.toString(),
        platformFee: platformFee.toString(),
        refundable:  refundable.toString(),
        status:      "Active",
        startedAt:   Math.floor(Date.now() / 1000),
        txHash:      tx.hash,
      };
      addRentalOptimistic(newRental);
      router.push("/dashboard/active");
    } catch (err: unknown) {
      useAppStore.getState().removeToast(tid);
      addToast({ type: "error", message: err instanceof Error ? err.message : "Transaction failed" });
    } finally {
      setRenting(false);
    }
  };

  return (
    <div className="min-h-[80vh] max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-white/40 hover:text-white mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Listings
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── Left: Asset information ──────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Image */}
          <div className="aspect-video rounded-2xl overflow-hidden border border-white/8 bg-gradient-to-br from-violet-900/20 to-indigo-900/10 flex items-center justify-center">
            {listing.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={listing.imageUrl} alt={listing.assetName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-7xl opacity-20">📦</span>
            )}
          </div>

          {/* Title + badge */}
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold text-white">{listing.assetName}</h1>
            <Badge variant={listing.isActive ? "green" : "red"} dot>
              {listing.isActive ? "Available" : "Unavailable"}
            </Badge>
          </div>

          {listing.description && (
            <p className="text-sm text-white/50 leading-relaxed">{listing.description}</p>
          )}

          {/* Key stats */}
          <div className="grid grid-cols-2 gap-3">
            <InfoBox label="Asset Value" value={ethToInrStr(assetValue)} sub={`${listing.assetValue} ETH`} />
            <InfoBox label="Daily Rental Fee" value={dailyFeeInr} sub={`${feePerDayEth.toFixed(5)} ETH/day`} />
            <InfoBox
              label="Owner"
              value={`${listing.owner.slice(0, 6)}…${listing.owner.slice(-4)}`}
              mono
            />
            {listing.category && (
              <InfoBox label="Category" value={listing.category} />
            )}
          </div>

          {/* Owner contact info (on-chain) */}
          {(rawOnChain?.location || rawOnChain?.ownerPhone || listing.location) && (
            <div className="rounded-2xl border border-white/8 bg-white/2 p-4 space-y-3">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Owner Contact / Pickup</p>
              {(rawOnChain?.ownerPhone) && (
                <div className="flex items-center gap-2.5 text-sm text-white/70">
                  <Phone className="w-4 h-4 text-violet-400/70 shrink-0" />
                  <span>{rawOnChain.ownerPhone}</span>
                </div>
              )}
              {(rawOnChain?.location || listing.location) && (
                <div className="flex items-start gap-2.5 text-sm text-white/70">
                  <MapPin className="w-4 h-4 text-violet-400/70 shrink-0 mt-0.5" />
                  <span>{rawOnChain?.location || listing.location}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Rental form ───────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Trust score */}
          <div className="rounded-2xl border border-white/8 bg-white/2 px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40">Your Trust Score</p>
              <p className="text-2xl font-bold text-white mt-0.5">{trustScore}</p>
              <p className="text-[11px] text-white/25 mt-0.5">Determines your deposit amount</p>
            </div>
            <TierBadge tier={trustTier} score={trustScore} />
          </div>

          {/* ── Rental form fields ─────────────────────────────────────────── */}
          {!isOwner && listing.isActive && (
            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 space-y-4">
              <p className="text-sm font-semibold text-violet-300">Rental Details</p>

              {/* Duration */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/50 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> Duration (days) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={rawOnChain ? Math.max(1, Math.ceil(Number(rawOnChain.minDuration) / 86400)) : 1}
                    max={365}
                    step={1}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className={inputCls + " pr-24"}
                    placeholder="7"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30">
                    {durationDays} day{durationDays !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Phone number */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/50 flex items-center gap-1.5">
                  <Phone className="w-3 h-3" /> Your Phone Number *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputCls}
                  placeholder="+91 98765 43210"
                />
                <p className="text-[11px] text-white/25">Shared with owner for pickup coordination</p>
              </div>
            </div>
          )}

          {/* ── Deposit breakdown ──────────────────────────────────────────── */}
          <div className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden">
            <div className="px-5 py-3 bg-violet-500/5 border-b border-white/5 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-violet-400" />
              <p className="text-xs font-semibold text-violet-300 uppercase tracking-widest">Deposit Breakdown</p>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              <BRow label="Asset Value"        value={`${ethToInrStr(assetValue)}`}      sub={`${listing.assetValue} ETH`} />
              <BRow label="Trust Score"        value={`${trustScore} / 100`}             muted />
              <BRow label="Duration"           value={`${durationDays} day${durationDays !== 1 ? "s" : ""}`} muted />
              <div className="h-px bg-white/5" />
              <BRow label="Security Deposit"   value={depositInr}                        sub={`${deposit.toFixed(5)} ETH`} accent="violet" bold />
              <BRow label="Platform Fee (1%)"  value={`− ${ethToInrStr(platformFee)}`}   accent="red" />
              <div className="h-px bg-white/5" />
              <BRow label="Refundable on completion" value={refundableInr}              sub={`${refundable.toFixed(5)} ETH`} accent="green" bold />

              {feePerDayEth > 0 && (
                <>
                  <div className="h-px bg-white/5 mt-1" />
                  <BRow
                    label={`Rental Fee (${durationDays}d × ${dailyFeeInr}/d)`}
                    value={totalFeeInr}
                    sub={`${totalFeeEth.toFixed(5)} ETH — paid at end`}
                    accent="default"
                  />
                </>
              )}
            </div>
          </div>

          {/* ── CTA ───────────────────────────────────────────────────────── */}
          {isOwner ? (
            <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 px-5 py-4 text-center">
              <p className="text-sm text-yellow-300/80">This is your own listing — you cannot rent it.</p>
            </div>
          ) : !listing.isActive ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-center">
              <p className="text-sm text-red-300/80">This listing is currently unavailable.</p>
            </div>
          ) : (
            <>
              <Button
                onClick={handleStartRental}
                loading={renting}
                size="lg"
                className="w-full text-base font-bold py-4"
              >
                {renting ? "Starting Rental…" : `🚀 Start Rental · Pay ${depositInr}`}
              </Button>
              <p className="text-[11px] text-center text-white/25">
                ₹{formatInr(ethToInr(totalFeeEth))} in rental fees paid at end of rental.
                All funds held by smart contract.
              </p>
            </>
          )}

          {/* Rate info */}
          <p className="text-[10px] text-center text-white/20">
            1 ETH = ₹{ETH_TO_INR.toLocaleString("en-IN")} (indicative rate, display only)
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoBox({ label, value, sub, mono = false }: { label: string; value: string; sub?: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-white/3 border border-white/5 px-4 py-3">
      <p className="text-[10px] text-white/30 mb-1">{label}</p>
      <p className={["text-sm font-semibold text-white/80", mono ? "font-mono text-xs" : ""].join(" ")}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-white/25 mt-0.5">{sub}</p>}
    </div>
  );
}

function BRow({
  label, value, sub, accent = "default", bold = false, muted = false,
}: {
  label: string; value: string; sub?: string;
  accent?: "default" | "red" | "violet" | "green";
  bold?: boolean; muted?: boolean;
}) {
  const valCls = {
    default: "text-white/70",
    red:     "text-red-400",
    violet:  "text-violet-300",
    green:   "text-emerald-400",
  }[accent];
  return (
    <div className="flex items-start justify-between gap-2">
      <span className={["text-xs leading-tight", muted ? "text-white/30" : "text-white/50"].join(" ")}>{label}</span>
      <div className="text-right">
        <span className={["text-xs leading-tight", bold ? "font-semibold" : "", valCls].join(" ")}>{value}</span>
        {sub && <p className="text-[10px] text-white/25 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
