// =============================================================================
// CollateralX Protocol – Listing Card
// =============================================================================

"use client";

import React from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { calcDeposit, ethToInrStr } from "@/lib/utils";
import type { Listing } from "@/types/rental";

interface ListingCardProps {
  listing: Listing;
  trustScore: number;
}

export function ListingCard({ listing, trustScore }: ListingCardProps) {
  const assetValue = parseFloat(listing.assetValue);
  const user = calcDeposit(assetValue, trustScore); // your deposit at your trust score

  // INR equivalents
  const assetValueInr  = ethToInrStr(assetValue);
  const depositInr     = ethToInrStr(user.deposit);

  // Savings vs a new user (score 50 → 30% floor deposit)
  const base          = calcDeposit(assetValue, 50);
  const saving        = base.deposit - user.deposit;
  const savingPct     = base.deposit > 0 ? Math.round((saving / base.deposit) * 100) : 0;

  return (
    <Card hover className="flex flex-col h-full">
      {/* Image */}
      <div className="h-40 rounded-t-2xl overflow-hidden bg-gradient-to-br from-violet-900/20 to-indigo-900/10 flex items-center justify-center">
        {listing.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.imageUrl} alt={listing.assetName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl opacity-30">📦</span>
        )}
      </div>

      <CardBody className="flex flex-col flex-1 gap-3">
        {/* Header */}
        <div>
          <h3 className="font-semibold text-white text-sm line-clamp-1">{listing.assetName}</h3>
          <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{listing.description || "No description provided."}</p>
        </div>

        {/* Location */}
        {listing.location && (
          <div className="flex items-start gap-1.5 text-white/40 min-w-0">
            <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-violet-400/60" />
            <span className="text-[11px] line-clamp-1">{listing.location}</span>
          </div>
        )}

        {/* Stats grid – show INR, not ETH */}
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Asset Value" value={assetValueInr} />
          <Stat label="Your Deposit" value={depositInr} highlight />
        </div>

        {/* Savings */}
        {saving > 0 && (
          <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/20 px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-emerald-400">You save</span>
            <span className="text-xs font-bold text-emerald-400">
              {ethToInrStr(saving)} ({savingPct}%)
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-1">
          <Badge variant="violet" size="sm">{listing.isActive ? "Active" : "Inactive"}</Badge>
          <Link href={`/dashboard/listings/${listing.id}`}>
            <Button size="sm" variant="secondary">View Details →</Button>
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-white/3 border border-white/5 px-2.5 py-2">
      <p className="text-[10px] text-white/30">{label}</p>
      <p className={["text-xs font-semibold", highlight ? "text-violet-300" : "text-white/70"].join(" ")}>
        {value}
      </p>
    </div>
  );
}
