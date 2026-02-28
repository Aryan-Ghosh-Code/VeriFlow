// =============================================================================
// CollateralX Protocol – Rental Card (Active Rentals)
// =============================================================================

"use client";

import React, { useState } from "react";
import { Phone, MapPin, Clock } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ethToInrStr, formatDate } from "@/lib/utils";
import { getSigner } from "@/lib/ethers";
import { getContractWrite } from "@/lib/contract";
import { useAppStore } from "@/store/useAppStore";
import { ethToWei } from "@/lib/utils";
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
  const [completing,  setCompleting]  = useState(false);
  const [paying,      setPaying]      = useState(false);
  const [disputing,   setDisputing]   = useState(false);
  const { addToast, setPendingReceipt } = useAppStore();

  const isOwner  = currentWallet.toLowerCase() === rental.owner.toLowerCase();
  const isRenter = currentWallet.toLowerCase() === rental.renter?.toLowerCase();
  const isActive = rental.status === "Active";

  // INR display
  const depositInr   = ethToInrStr(parseFloat(rental.depositPaid));
  const feeInr       = ethToInrStr(parseFloat(rental.platformFee));
  const refundInr    = ethToInrStr(parseFloat(rental.refundable));

  // ── Owner: complete or raise dispute ────────────────────────────────────
  const handleComplete = async () => {
    setCompleting(true);
    const tid = addToast({ type: "loading", message: "Completing rental…" });
    try {
      const signer   = await getSigner();
      const contract = getContractWrite(signer);
      const tx       = await contract.completeRental(rental.rentalId, { gasLimit: BigInt(300_000) });
      const receipt  = await tx.wait();
      useAppStore.getState().removeToast(tid);
      addToast({ type: "success", message: "Rental completed! Deposit refunded." });
      setPendingReceipt({
        rentalId:       rental.rentalId,
        assetName:      rental.assetName,
        depositPaid:    rental.depositPaid,
        platformFee:    rental.platformFee,
        refundedAmount: rental.refundable,
        txHash:         receipt?.hash ?? tx.hash,
        completedAt:    Math.floor(Date.now() / 1000),
      });
      onRefetch();
    } catch (err: unknown) {
      useAppStore.getState().removeToast(tid);
      addToast({ type: "error", message: err instanceof Error ? err.message : "Failed" });
    } finally {
      setCompleting(false);
    }
  };

  const handleDispute = async () => {
    setDisputing(true);
    const tid = addToast({ type: "loading", message: "Raising dispute…" });
    try {
      const signer   = await getSigner();
      const contract = getContractWrite(signer);
      const tx = await contract.raiseDispute(
        rental.rentalId,
        2,   // Moderate by default
        "",  // evidence hash (IPFS)
        { gasLimit: BigInt(300_000) },
      );
      await tx.wait();
      useAppStore.getState().removeToast(tid);
      addToast({ type: "success", message: "Dispute raised. Protocol will review." });
      onRefetch();
    } catch (err: unknown) {
      useAppStore.getState().removeToast(tid);
      addToast({ type: "error", message: err instanceof Error ? err.message : "Failed" });
    } finally {
      setDisputing(false);
    }
  };

  // ── Renter: pay final rental fee ─────────────────────────────────────────
  const handlePayFinal = async () => {
    if (!rental.finalAmount) return addToast({ type: "error", message: "Final amount not set." });
    setPaying(true);
    const tid = addToast({ type: "loading", message: "Paying rental fee…" });
    try {
      const signer   = await getSigner();
      const contract = getContractWrite(signer);
      const finalWei = ethToWei(rental.finalAmount);
      const tx = await contract.payFinalAmount(rental.rentalId, { value: finalWei, gasLimit: BigInt(200_000) });
      await tx.wait();
      useAppStore.getState().removeToast(tid);
      addToast({ type: "success", message: `✅ Rental fee paid — ₹${rental.finalAmount} ETH transferred.` });
      onRefetch();
    } catch (err: unknown) {
      useAppStore.getState().removeToast(tid);
      addToast({ type: "error", message: err instanceof Error ? err.message : "Failed" });
    } finally {
      setPaying(false);
    }
  };

  return (
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

        {/* Role indicator */}
        <div className="flex items-center gap-2">
          <span className={[
            "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
            isOwner
              ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
              : "text-violet-400 border-violet-500/30 bg-violet-500/10",
          ].join(" ")}>
            {isOwner ? "📦 You are the Owner" : "🤝 You are the Renter"}
          </span>
        </div>

        {/* Financial breakdown in INR */}
        <div className="rounded-xl bg-white/3 border border-white/5 px-4 py-3 space-y-2">
          <FinRow label="Security Deposit"   value={depositInr}  sub={`${rental.depositPaid} ETH`} />
          <FinRow label="Platform Fee (1%)"  value={`− ${feeInr}`} sub={`${rental.platformFee} ETH`} red />
          <div className="h-px bg-white/5" />
          <FinRow label="Refundable"         value={refundInr}   sub={`${rental.refundable} ETH`} green />
          {rental.finalAmount && parseFloat(rental.finalAmount) > 0 && (
            <>
              <div className="h-px bg-white/5" />
              <FinRow
                label={"Rental Fee Due"}
                value={ethToInrStr(parseFloat(rental.finalAmount))}
                sub={`${rental.finalAmount} ETH`}
              />
            </>
          )}
        </div>

        {/* Phone (renter can see) */}
        {rental.renterPhone && (
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Phone className="w-3 h-3 text-violet-400/60" />
            <span>{rental.renterPhone}</span>
          </div>
        )}

        {/* Date / timeline */}
        <div className="flex items-center gap-1.5 text-[10px] text-white/25">
          <Clock className="w-3 h-3" />
          Started: {formatDate(rental.startedAt)}
        </div>

        {/* ── Owner actions ── */}
        {isOwner && isActive && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleComplete} loading={completing} className="flex-1">
              ✓ Complete
            </Button>
            <Button size="sm" variant="danger" onClick={handleDispute} loading={disputing} className="flex-1">
              ⚠ Dispute
            </Button>
          </div>
        )}

        {/* ── Renter action: pay final fee ── */}
        {isRenter && isActive && rental.finalAmount && !rental.finalPaid && (
          <Button size="sm" variant="secondary" onClick={handlePayFinal} loading={paying} className="w-full">
            💳 Pay Rental Fee · {ethToInrStr(parseFloat(rental.finalAmount))}
          </Button>
        )}
      </CardBody>
    </Card>
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
