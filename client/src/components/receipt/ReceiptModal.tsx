// =============================================================================
// CollateralX Protocol – Receipt Modal
// =============================================================================

"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatEth, formatDate } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

export function ReceiptModal() {
  const { pendingReceipt, setPendingReceipt } = useAppStore();

  if (!pendingReceipt) return null;

  const { rentalId, assetName, depositPaid, platformFee, refundedAmount, txHash, completedAt } =
    pendingReceipt;

  return (
    <Modal isOpen title="Rental Receipt" onClose={() => setPendingReceipt(null)}>
      {/* Receipt card body */}
      <div className="space-y-5">
        {/* Confetti header */}
        <div className="text-center py-2">
          <p className="text-4xl mb-2">🎉</p>
          <h3 className="text-xl font-bold text-white">Rental Completed</h3>
          <p className="text-xs text-white/40 mt-1">Deposit refunded to renter&apos;s wallet</p>
        </div>

        {/* Receipt card */}
        <div className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden font-mono">
          {/* Dashed separator top */}
          <div className="px-5 py-3 bg-violet-500/5 border-b border-dashed border-white/8 flex items-center justify-between">
            <span className="text-xs text-violet-300 font-semibold uppercase tracking-wider">CollateralX</span>
            <span className="text-[10px] text-white/30">{formatDate(completedAt)}</span>
          </div>

          <div className="px-5 py-4 space-y-3">
            <ReceiptRow label="Rental ID"   value={`#${rentalId}`} />
            <ReceiptRow label="Asset"       value={assetName} />
            <div className="h-px border-t border-dashed border-white/8" />
            <ReceiptRow label="Deposit Paid"   value={formatEth(depositPaid)} />
            <ReceiptRow label="Platform Fee"   value={`− ${formatEth(platformFee)}`} red />
            <div className="h-px border-t border-dashed border-white/8" />
            <ReceiptRow label="Refunded"   value={formatEth(refundedAmount)} green bold />
          </div>

          {/* Tx hash footer */}
          <div className="px-5 py-3 bg-white/2 border-t border-dashed border-white/8">
            <p className="text-[10px] text-white/25 mb-1">Transaction Hash</p>
            <p className="text-[10px] text-white/50 break-all">{txHash}</p>
          </div>
        </div>

        <Button
          onClick={() => setPendingReceipt(null)}
          className="w-full"
          variant="secondary"
        >
          Close
        </Button>
      </div>
    </Modal>
  );
}

function ReceiptRow({
  label,
  value,
  red = false,
  green = false,
  bold = false,
}: {
  label: string;
  value: string;
  red?: boolean;
  green?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-white/40">{label}</span>
      <span
        className={[
          "text-[11px]",
          bold ? "font-bold" : "font-medium",
          red   ? "text-red-400"     :
          green ? "text-emerald-400" :
                  "text-white/70",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}
