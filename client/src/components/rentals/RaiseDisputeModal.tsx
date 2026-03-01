// =============================================================================
// VeriFlow Protocol – Raise Dispute Modal
// =============================================================================

"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { getSigner } from "@/lib/ethers";
import { getContractWrite } from "@/lib/contract";
import { useAppStore } from "@/store/useAppStore";
import { ethToInrStr } from "@/lib/utils";

// Matches DisputeSeverity enum in VeriFlow.sol
// None = 0, Minor = 1, Moderate = 2, Severe = 3
const SEVERITIES = [
  {
    id: 1,
    label: "Minor",
    emoji: "🟡",
    description: "Late return ≤24h, cosmetic wear",
    collateralFraction: "25%",
    trustPenalty: "−3 pts",
    borderColor: "border-yellow-500/30",
    activeBorder: "border-yellow-400",
    activeBg: "bg-yellow-500/10",
    labelColor: "text-yellow-400",
    dotColor: "bg-yellow-400",
  },
  {
    id: 2,
    label: "Moderate",
    emoji: "🟠",
    description: "Damage needing repair, 2+ days late",
    collateralFraction: "50%",
    trustPenalty: "−8 pts",
    borderColor: "border-orange-500/30",
    activeBorder: "border-orange-400",
    activeBg: "bg-orange-500/10",
    labelColor: "text-orange-400",
    dotColor: "bg-orange-400",
  },
  {
    id: 3,
    label: "Severe",
    emoji: "🔴",
    description: "Theft, major damage, no-show",
    collateralFraction: "100%",
    trustPenalty: "−15 pts",
    borderColor: "border-red-500/30",
    activeBorder: "border-red-500",
    activeBg: "bg-red-500/10",
    labelColor: "text-red-400",
    dotColor: "bg-red-400",
  },
] as const;

interface RaiseDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  rentalId: string;
  assetName: string;
  collateralEth: number;
  onSuccess: () => void;
}

export function RaiseDisputeModal({
  isOpen,
  onClose,
  rentalId,
  assetName,
  collateralEth,
  onSuccess,
}: RaiseDisputeModalProps) {
  const { addToast } = useAppStore();
  const [selectedSeverity, setSelectedSeverity] = useState<1 | 2 | 3 | null>(null);
  const [evidence, setEvidence] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selected = SEVERITIES.find((s) => s.id === selectedSeverity) ?? null;

  const compensationEth =
    selectedSeverity === 1 ? collateralEth * 0.25 :
    selectedSeverity === 2 ? collateralEth * 0.50 :
    selectedSeverity === 3 ? collateralEth          : 0;

  const handleSubmit = async () => {
    if (!selectedSeverity) return addToast({ type: "error", message: "Please select a severity level." });
    if (!evidence.trim())  return addToast({ type: "error", message: "Please describe the issue as evidence." });

    setSubmitting(true);
    const tid = addToast({ type: "loading", message: "Raising dispute on-chain…" });
    try {
      const signer   = await getSigner();
      const contract = getContractWrite(signer);
      const tx = await contract.raiseDispute(
        rentalId,
        selectedSeverity,
        evidence.trim(),
        { gasLimit: BigInt(300_000) }
      );
      await tx.wait();
      useAppStore.getState().removeToast(tid);
      addToast({ type: "success", message: `⚖️ Dispute raised — ${selected?.label} severity logged on-chain.` });
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      useAppStore.getState().removeToast(tid);
      addToast({ type: "error", message: err instanceof Error ? err.message : "Transaction failed." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setSelectedSeverity(null);
    setEvidence("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="⚖️ Raise a Dispute" maxWidth="max-w-lg">
      {/* Scrollable content container — critical for small screens */}
      <div className="max-h-[70vh] overflow-y-auto -mx-6 px-6 space-y-4">

        {/* Context chip */}
        <div className="flex items-center gap-3 rounded-xl bg-white/3 border border-white/8 px-3 py-2.5">
          <span className="text-2xl">📦</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{assetName}</p>
            <p className="text-xs text-white/30">Rental #{rentalId}</p>
          </div>
        </div>

        {/* Warning */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 flex gap-2.5">
          <span className="text-amber-400 text-base shrink-0 mt-0.5">⚠️</span>
          <p className="text-xs text-amber-300/80 leading-relaxed">
            False disputes are penalised <strong>−2 trust pts</strong> if rejected. Only raise if you have genuine evidence.
          </p>
        </div>

        {/* Severity selector */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">Severity Level</p>
          <div className="space-y-2">
            {SEVERITIES.map((s) => {
              const isActive = selectedSeverity === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSeverity(s.id as 1 | 2 | 3)}
                  className={[
                    "w-full rounded-xl border px-3 py-3 text-left transition-all duration-150",
                    isActive
                      ? `${s.activeBorder} ${s.activeBg}`
                      : `${s.borderColor} bg-white/2 hover:bg-white/4`,
                  ].join(" ")}
                >
                  {/* Top row: label + collateral badge */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          "w-2 h-2 rounded-full shrink-0",
                          isActive ? s.dotColor : "bg-white/20",
                        ].join(" ")}
                      />
                      <span className={["text-sm font-semibold", isActive ? s.labelColor : "text-white/60"].join(" ")}>
                        {s.emoji} {s.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-white/50 font-medium">{s.collateralFraction} collateral</span>
                      <span className="text-[11px] text-white/30">{s.trustPenalty}</span>
                    </div>
                  </div>
                  {/* Description */}
                  <p className="text-xs text-white/35 pl-4">{s.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Compensation preview */}
        {selectedSeverity && (
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-3 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-violet-300/60">You receive if upheld</p>
              <p className="text-base font-bold text-white mt-0.5">{ethToInrStr(compensationEth)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-white/25">{compensationEth.toFixed(6)} ETH</p>
              <p className="text-[11px] text-white/20">of {collateralEth.toFixed(6)} ETH collateral</p>
            </div>
          </div>
        )}

        {/* Evidence */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
            Evidence Description *
          </label>
          <textarea
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="Describe the issue — damage found, missing items, late return, etc. Stored on-chain."
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder-white/20 px-3.5 py-2.5 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all resize-none"
          />
          <p className="text-[10px] text-white/20">{evidence.length} chars</p>
        </div>
      </div>

      {/* Sticky actions — outside scroll area */}
      <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-white/5 mt-4">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 order-2 sm:order-1"
          onClick={handleClose}
          disabled={submitting}
        >
          Cancel
        </Button>
        <button
          onClick={handleSubmit}
          disabled={!selectedSeverity || !evidence.trim() || submitting}
          className="flex-1 order-1 sm:order-2 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-all bg-red-600 hover:bg-red-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting
            ? <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            : "⚖️"}
          {submitting ? "Submitting…" : "Submit Dispute"}
        </button>
      </div>
    </Modal>
  );
}
