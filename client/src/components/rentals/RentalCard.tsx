// =============================================================================
// VeriFlow Protocol – Rental Card (Active Rentals)
// =============================================================================

"use client";

import React, { useState } from "react";
import { Phone, Clock, Shield } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RaiseDisputeModal } from "@/components/rentals/RaiseDisputeModal";
import { ResolveDisputeModal } from "@/components/rentals/ResolveDisputeModal";
import { ethToInrStr, ethToWei, formatDate } from "@/lib/utils";
import { getSigner } from "@/lib/ethers";
import { getContractWrite } from "@/lib/contract";
import { useAppStore } from "@/store/useAppStore";
import type { ActiveRental, RentalStatus } from "@/types/rental";

interface RentalCardProps {
  rental: ActiveRental;
  currentWallet: string;
  onRefetch: () => void;
}

const statusVariant: Record<RentalStatus, "green" | "violet" | "red"> = {
  Active:    "green",
  Completed: "violet",
  Disputed:  "red",
};

export function RentalCard({ rental, currentWallet, onRefetch }: RentalCardProps) {
  const [paying, setPaying]           = useState(false);
  const [completing, setCompleting]   = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const { addToast } = useAppStore();

  const isActive    = rental.status === "Active";
  const isDisputed  = rental.status === "Disputed";
  const isOwnerView = rental.role === "owner";

  // INR display
  const depositInr = ethToInrStr(parseFloat(rental.depositPaid));
  const feeInr     = ethToInrStr(parseFloat(rental.platformFee));
  const refundInr  = ethToInrStr(parseFloat(rental.refundable));

  // ── Renter: pay final rental fee ────────────────────────────────────────────
  const handlePayFinal = async () => {
    if (!rental.finalAmount) return addToast({ type: "error", message: "Final amount not set." });
    setPaying(true);
    const tid = addToast({ type: "loading", message: "Paying rental fee…" });
    try {
      const signer   = await getSigner();
      const contract = getContractWrite(signer);
      const tx = await contract.payFinalAmount(rental.rentalId, {
        value: ethToWei(rental.finalAmount),
        gasLimit: BigInt(200_000),
      });
      await tx.wait();
      useAppStore.getState().removeToast(tid);
      addToast({ type: "success", message: `✅ Rental fee paid successfully.` });
      onRefetch();
    } catch (err: unknown) {
      useAppStore.getState().removeToast(tid);
      addToast({ type: "error", message: err instanceof Error ? err.message : "Failed" });
    } finally { setPaying(false); }
  };

  // ── Owner: complete rental ───────────────────────────────────────────────────
  const handleComplete = async () => {
    setCompleting(true);
    const tid = addToast({ type: "loading", message: "Completing rental…" });
    try {
      const signer   = await getSigner();
      const contract = getContractWrite(signer);
      const tx = await contract.completeRental(rental.rentalId, { gasLimit: BigInt(300_000) });
      await tx.wait();
      useAppStore.getState().removeToast(tid);
      addToast({ type: "success", message: `🎉 Rental completed — collateral refunded to renter.` });
      onRefetch();
    } catch (err: unknown) {
      useAppStore.getState().removeToast(tid);
      addToast({ type: "error", message: err instanceof Error ? err.message : "Failed" });
    } finally { setCompleting(false); }
  };

  return (
    <>
      <Card>
        <CardBody className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-white text-sm">{rental.assetName}</p>
              <p className="text-xs text-white/30 mt-0.5">Rental #{rental.rentalId}</p>
            </div>
            <Badge variant={statusVariant[rental.status]} dot>{rental.status}</Badge>
          </div>

          {/* Role badge */}
          <div className="flex items-center gap-2">
            {isOwnerView ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                🏷️ You are the Owner
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-violet-400 border-violet-500/30 bg-violet-500/10">
                🤝 You are the Renter
              </span>
            )}
          </div>

          {/* Financial breakdown */}
          <div className="rounded-xl bg-white/3 border border-white/5 px-4 py-3 space-y-2">
            <FinRow label="Security Deposit"  value={depositInr}     sub={`${rental.depositPaid} ETH`} />
            <FinRow label="Platform Fee (1%)" value={`− ${feeInr}`}  sub={`${rental.platformFee} ETH`} red />
            <div className="h-px bg-white/5" />
            <FinRow label="Refundable"         value={refundInr}      sub={`${rental.refundable} ETH`} green />
            {rental.finalAmount && parseFloat(rental.finalAmount) > 0 && (
              <>
                <div className="h-px bg-white/5" />
                <FinRow
                  label={rental.finalPaid ? "Rental Fee (Paid ✓)" : "Rental Fee Due"}
                  value={ethToInrStr(parseFloat(rental.finalAmount))}
                  sub={`${rental.finalAmount} ETH`}
                  green={rental.finalPaid}
                />
              </>
            )}
          </div>

          {/* Contact info */}
          {isOwnerView && rental.renterPhone && (
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Phone className="w-3 h-3 text-violet-400/60" />
              <span>Renter: {rental.renterPhone}</span>
            </div>
          )}
          {!isOwnerView && rental.ownerPhone && (
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Phone className="w-3 h-3 text-emerald-400/60" />
              <span>Owner: {rental.ownerPhone}</span>
            </div>
          )}

          {/* Timeline */}
          <div className="flex items-center gap-1.5 text-[10px] text-white/25">
            <Clock className="w-3 h-3" />
            Started: {formatDate(rental.startedAt)}
            {rental.endTime && (
              <span className="ml-2">· Due: {formatDate(rental.endTime)}</span>
            )}
          </div>

          {/* ── RENTER ACTIONS ── */}
          {!isOwnerView && (
            <div className="space-y-2">
              {/* Pay rental fee */}
              {isActive && rental.finalAmount && !rental.finalPaid && (
                <Button size="sm" variant="secondary" onClick={handlePayFinal} loading={paying} className="w-full">
                  💳 Pay Rental Fee · {ethToInrStr(parseFloat(rental.finalAmount))}
                </Button>
              )}
              {/* Renter raise dispute */}
              {isActive && !isDisputed && (
                <button
                  onClick={() => setDisputeOpen(true)}
                  className="w-full text-xs text-red-400/60 hover:text-red-400 transition-colors py-1 border border-transparent hover:border-red-500/20 rounded-lg hover:bg-red-500/5"
                >
                  ⚖️ Raise a Dispute
                </button>
              )}
            </div>
          )}

          {/* ── OWNER ACTIONS ── */}
          {isOwnerView && (
            <div className="space-y-2">
              {/* Complete rental — only if fee paid */}
              {isActive && rental.finalPaid && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleComplete}
                  loading={completing}
                  className="w-full"
                >
                  ✅ Complete Rental & Release Collateral
                </Button>
              )}
              {/* Nudge if fee not yet paid */}
              {isActive && !rental.finalPaid && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <p className="text-[11px] text-amber-300/80">
                    Waiting for renter to pay the rental fee before you can complete.
                  </p>
                </div>
              )}
              {/* Owner raise dispute */}
              {(isActive || rental.status === "Completed") && !isDisputed && (
                <button
                  onClick={() => setDisputeOpen(true)}
                  className="w-full text-xs text-red-400/60 hover:text-red-400 transition-colors py-1 border border-transparent hover:border-red-500/20 rounded-lg hover:bg-red-500/5"
                >
                  ⚖️ Raise a Dispute
                </button>
              )}
              {isDisputed && (
                <button
                  onClick={() => setResolveOpen(true)}
                  className="w-full text-xs text-violet-400/70 hover:text-violet-300 transition-colors py-1.5 border border-violet-500/20 hover:border-violet-500/40 rounded-lg hover:bg-violet-500/5"
                >
                  ⚖️ Resolve Dispute
                </button>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Dispute modals */}
      <RaiseDisputeModal
        isOpen={disputeOpen}
        onClose={() => setDisputeOpen(false)}
        rentalId={rental.rentalId}
        assetName={rental.assetName}
        collateralEth={parseFloat(rental.depositPaid)}
        onSuccess={onRefetch}
      />
      <ResolveDisputeModal
        isOpen={resolveOpen}
        onClose={() => setResolveOpen(false)}
        rentalId={rental.rentalId}
        assetName={rental.assetName}
        severity={2}
        collateralEth={parseFloat(rental.depositPaid)}
        onSuccess={onRefetch}
      />
    </>
  );
}

function FinRow({
  label, value, sub, red = false, green = false,
}: {
  label: string; value: string; sub?: string; red?: boolean; green?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-xs text-white/40 shrink-0">{label}</span>
      <div className="text-right">
        <span className={["text-xs font-medium", red ? "text-red-400" : green ? "text-emerald-400" : "text-white/70"].join(" ")}>
          {value}
        </span>
        {sub && <p className="text-[10px] text-white/25 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
