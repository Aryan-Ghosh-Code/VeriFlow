// =============================================================================
// CollateralX Protocol – Rental Card (Active Rentals)
// =============================================================================

"use client";

import React, { useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatEth, formatDate } from "@/lib/utils";
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
  const [completing, setCompleting] = useState(false);
  const [disputing,  setDisputing]  = useState(false);
  const { addToast, setPendingReceipt } = useAppStore();

  const isOwner = currentWallet.toLowerCase() === rental.owner.toLowerCase();
  const canAct  = isOwner && rental.status === "Active";

  const handleComplete = async () => {
    setCompleting(true);
    const tid = addToast({ type: "loading", message: "Completing rental…" });
    try {
      const signer   = await getSigner();
      const contract = getContractWrite(signer);
      const tx = await contract.completeRental(rental.rentalId);
      const receipt = await tx.wait();
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
      const tx = await contract.raiseDispute(rental.rentalId);
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

  return (
    <Card>
      <CardBody className="space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-white text-sm">{rental.assetName}</p>
            <p className="text-xs text-white/30 mt-0.5">Rental #{rental.rentalId}</p>
          </div>
          <Badge variant={statusVariant[rental.status]} dot>{rental.status}</Badge>
        </div>

        {/* Financial breakdown */}
        <div className="space-y-2">
          <FinRow label="Deposit Paid"      value={formatEth(rental.depositPaid)} />
          <FinRow label="Platform Fee"      value={`− ${formatEth(rental.platformFee)}`} red />
          <div className="h-px bg-white/5" />
          <FinRow label="Refundable"        value={formatEth(rental.refundable)} green />
        </div>

        {/* Date */}
        <p className="text-[10px] text-white/25">
          Started: {formatDate(rental.startedAt)}
        </p>

        {/* Actions (owner only) */}
        {canAct && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleComplete}
              loading={completing}
              className="flex-1"
            >
              Complete
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={handleDispute}
              loading={disputing}
              className="flex-1"
            >
              Dispute
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function FinRow({ label, value, red = false, green = false }: { label: string; value: string; red?: boolean; green?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-white/40">{label}</span>
      <span className={["text-xs font-medium", red ? "text-red-400" : green ? "text-emerald-400" : "text-white/70"].join(" ")}>
        {value}
      </span>
    </div>
  );
}
