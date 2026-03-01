// =============================================================================
// CollateralX Protocol – Resolve Dispute Modal (Owner / Hackathon flow)
// =============================================================================
// After a dispute is raised, the accused party has 72h (RESPONSE_WINDOW) to
// respond on-chain. Once that window expires, resolveDispute() can be called.
//
// Outcomes:
//   Upheld  (1) – renter was at fault: owner receives compensationAmount,
//                  renter receives any remaining collateral.
//   Rejected (2) – dispute was invalid: renter gets full collateral back,
//                  owner's trust score is penalised -2 pts.
// =============================================================================

"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { getSigner } from "@/lib/ethers";
import { getContractWrite } from "@/lib/contract";
import { useAppStore } from "@/store/useAppStore";
import { ethToInrStr } from "@/lib/utils";

// Must match DisputeOutcome enum: Pending=0, Upheld=1, Rejected=2, Withdrawn=3
const UPHELD   = 1;
const REJECTED = 2;

interface ResolveDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  rentalId: string;
  assetName: string;
  /** Severity the dispute was raised at (1=Minor, 2=Moderate, 3=Severe) */
  severity: 1 | 2 | 3;
  /** Full collateral amount in ETH */
  collateralEth: number;
  onSuccess: () => void;
}

export function ResolveDisputeModal({
  isOpen,
  onClose,
  rentalId,
  assetName,
  severity,
  collateralEth,
  onSuccess,
}: ResolveDisputeModalProps) {
  const { addToast } = useAppStore();
  const [resolving, setResolving] = useState(false);

  // Compensation the owner receives if Upheld
  const compensationEth =
    severity === 1 ? collateralEth * 0.25 :
    severity === 2 ? collateralEth * 0.50 :
                     collateralEth;

  const renterRefundEth = collateralEth - compensationEth;

  const severityLabel =
    severity === 1 ? "Minor" : severity === 2 ? "Moderate" : "Severe";

  const resolve = async (outcome: typeof UPHELD | typeof REJECTED) => {
    setResolving(true);
    const label = outcome === UPHELD ? "Upheld" : "Rejected";
    const tid = addToast({ type: "loading", message: `Resolving dispute as ${label}…` });
    try {
      const signer   = await getSigner();
      const contract = getContractWrite(signer);
      const tx = await contract.resolveDispute(rentalId, outcome, { gasLimit: BigInt(350_000) });
      await tx.wait();
      useAppStore.getState().removeToast(tid);
      const msg =
        outcome === UPHELD
          ? `✅ Dispute upheld — ${ethToInrStr(compensationEth)} collateral transferred to you.`
          : `🔁 Dispute rejected — full collateral returned to renter.`;
      addToast({ type: "success", message: msg });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      useAppStore.getState().removeToast(tid);
      const msg = err instanceof Error ? err.message : "Transaction failed.";
      // Friendly hint for the 72h window requirement
      const friendly = msg.includes("Response window active")
        ? "Resolution is locked until the 1-minute response window expires. Wait a moment and try again."
        : msg;
      addToast({ type: "error", message: friendly });
    } finally {
      setResolving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⚖️ Resolve Dispute" maxWidth="max-w-md">
      <div className="space-y-4">

        {/* Context */}
        <div className="flex items-center gap-3 rounded-xl bg-white/3 border border-white/8 px-3 py-2.5">
          <span className="text-2xl">📦</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{assetName}</p>
            <p className="text-xs text-white/30">Rental #{rentalId} · {severityLabel} dispute</p>
          </div>
        </div>

        {/* How resolution works */}
        <div className="rounded-xl border border-white/8 bg-white/2 overflow-hidden">
          <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider px-3 pt-3 pb-2">
            What happens
          </p>

          {/* Upheld row */}
          <div className="px-3 pb-3 space-y-1.5">
            <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold text-emerald-400">✅ Upheld</p>
                <p className="text-xs text-white/40 mt-0.5">Renter was at fault</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-white">{ethToInrStr(compensationEth)}</p>
                <p className="text-[10px] text-white/25">→ you (owner)</p>
                {renterRefundEth > 0 && (
                  <p className="text-[10px] text-white/25">{ethToInrStr(renterRefundEth)} → renter</p>
                )}
              </div>
            </div>

            {/* Rejected row */}
            <div className="flex items-start justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold text-red-400">❌ Rejected</p>
                <p className="text-xs text-white/40 mt-0.5">Dispute was unfounded</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-white">{ethToInrStr(collateralEth)}</p>
                <p className="text-[10px] text-white/25">→ renter (full refund)</p>
                <p className="text-[10px] text-red-400/60 mt-0.5">−2 pts to your trust score</p>
              </div>
            </div>
          </div>
        </div>

        {/* 72h notice */}
        <div className="flex items-start gap-2 rounded-xl border border-violet-500/15 bg-violet-500/5 px-3 py-2.5">
          <span className="text-violet-400 text-base shrink-0">⏳</span>
          <p className="text-xs text-violet-300/70 leading-relaxed">
            Resolution is only possible after the <strong>1-minute response window</strong> expires from when the dispute was raised. The contract will reject early calls.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={onClose}
            disabled={resolving}
          >
            Close
          </Button>
          <button
            onClick={() => resolve(REJECTED)}
            disabled={resolving}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-all border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {resolving
              ? <span className="h-3 w-3 rounded-full border-2 border-red-400/30 border-t-red-400 animate-spin" />
              : null}
            Reject Dispute
          </button>
          <button
            onClick={() => resolve(UPHELD)}
            disabled={resolving}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-all bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {resolving
              ? <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : null}
            Uphold Dispute
          </button>
        </div>
      </div>
    </Modal>
  );
}
