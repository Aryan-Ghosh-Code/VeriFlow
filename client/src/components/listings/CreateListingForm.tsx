// =============================================================================
// CollateralX Protocol – Create Listing Form
// =============================================================================

"use client";

import React, { useState, useRef } from "react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/store/useAppStore";
import { useListings } from "@/hooks/useListings";
import { getSigner, getReadProvider } from "@/lib/ethers";
import { getContractWrite, getContractRead } from "@/lib/contract";
import { ethToWei, ethToInrStr } from "@/lib/utils";

interface FormData {
  assetName: string;
  assetValue: string;
  description: string;
  imageUrl: string;
  rentalFeePerDay: string;
  minDuration: string;   // in days
  maxExtension: string;  // in days
  ownerPhone: string;
  location: string;      // physical pickup/return address
}

const EMPTY: FormData = {
  assetName: "",
  assetValue: "",
  description: "",
  imageUrl: "",
  rentalFeePerDay: "",
  minDuration: "1",
  maxExtension: "7",
  ownerPhone: "",
  location: "",
};

export function CreateListingForm() {
  const [form, setForm]       = useState<FormData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { walletAddress, addToast } = useAppStore();
  const { optimisticAdd, saveListing, refetch } = useListings();

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setForm((prev) => ({ ...prev, imageUrl: url }));
  };

  // Live INR preview for numeric fields
  const assetValueInr    = form.assetValue     ? ethToInrStr(parseFloat(form.assetValue))     : null;
  const rentalFeeInr     = form.rentalFeePerDay ? ethToInrStr(parseFloat(form.rentalFeePerDay)) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) return addToast({ type: "error", message: "Connect wallet first." });
    if (!form.assetName || !form.assetValue || !form.rentalFeePerDay)
      return addToast({ type: "error", message: "Fill all required fields." });

    setLoading(true);
    const toastId = addToast({ type: "loading", message: "Creating listing…" });

    // Optimistic UI update (MongoDB metadata)
    optimisticAdd({
      assetName:   form.assetName,
      description: form.description,
      assetValue:  form.assetValue,
      owner:       walletAddress,
      imageUrl:    form.imageUrl || undefined,
      location:    form.location || undefined,
    });

    try {
      // ── On-chain transaction ──────────────────────────────────────────────
      const signer   = await getSigner();
      const contract = getContractWrite(signer);

      const valueWei      = ethToWei(form.assetValue);
      const feePerDayWei  = ethToWei(form.rentalFeePerDay);
      const minDurSec     = BigInt(Math.round(Number(form.minDuration) * 86400));
      const maxExtSec     = BigInt(Math.round(Number(form.maxExtension) * 86400));

      const tx = await contract.createListing(
        form.assetName,
        valueWei,
        minDurSec,
        maxExtSec,
        feePerDayWei,
        form.ownerPhone,
        form.location,
        { gasLimit: BigInt(500_000) },
      );
      await tx.wait();

      // Read the new on-chain listing ID immediately after confirmation
      // listingCount() increments with each new listing, so current value = new ID
      let chainId: string | undefined;
      try {
        const readProvider = getReadProvider();
        const readContract = getContractRead(readProvider);
        const count: bigint = await readContract.listingCount();
        chainId = count.toString();
        readProvider.destroy();
      } catch {
        // Non-fatal — listing can still be viewed by numeric URL
      }

      // ── Persist metadata to MongoDB ───────────────────────────────────────
      await saveListing({
        owner:       walletAddress,
        assetName:   form.assetName,
        description: form.description,
        assetValue:  form.assetValue,
        imageUrl:    form.imageUrl || undefined,
        location:    form.location || undefined,
        chainId,     // ← syncs the on-chain ID to MongoDB immediately
      });

      useAppStore.getState().removeToast(toastId);
      addToast({ type: "success", message: `Listing "${form.assetName}" created!` });
      setForm(EMPTY);
      setPreview(null);
      await refetch();
    } catch (err: unknown) {
      useAppStore.getState().removeToast(toastId);
      const msg = err instanceof Error ? err.message : "Transaction failed";
      addToast({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-[var(--text-strong)]">Create Listing</h2>
        <p className="text-xs text-[var(--text-subtle)] mt-0.5">Add an asset available for rental</p>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image upload */}
          <div
            onClick={() => fileRef.current?.click()}
            className="relative h-32 rounded-xl border border-dashed border-white/10 bg-white/2 cursor-pointer hover:border-violet-500/50 hover:bg-violet-500/5 transition-all overflow-hidden flex items-center justify-center"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <p className="text-2xl mb-1">🖼</p>
                <p className="text-xs text-white/30">Click to upload image (optional)</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />

          <Field label="Asset Name *">
            <input
              value={form.assetName}
              onChange={set("assetName")}
              required
              className={inputCls}
              placeholder="e.g. DJI Drone Pro"
            />
          </Field>

          {/* Asset Value with live INR preview */}
          <Field label="Asset Value (ETH) *">
            <div className="relative">
              <input
                value={form.assetValue}
                onChange={set("assetValue")}
                type="number"
                step="0.001"
                min="0.001"
                required
                className={inputCls + " pr-28"}
                placeholder="0.5"
              />
              {assetValueInr && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-emerald-400/80">
                  ≈ {assetValueInr}
                </span>
              )}
            </div>
          </Field>

          {/* Rental Fee with live INR preview */}
          <Field label="Rental Fee / Day (ETH) *">
            <div className="relative">
              <input
                value={form.rentalFeePerDay}
                onChange={set("rentalFeePerDay")}
                type="number"
                step="0.0001"
                min="0.0001"
                required
                className={inputCls + " pr-28"}
                placeholder="0.01"
              />
              {rentalFeeInr && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-emerald-400/80">
                  ≈ {rentalFeeInr}
                </span>
              )}
            </div>
          </Field>

          {/* Duration fields side by side */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min Duration (days) *">
              <input
                value={form.minDuration}
                onChange={set("minDuration")}
                type="number"
                min="1"
                step="1"
                required
                className={inputCls}
                placeholder="1"
              />
            </Field>
            <Field label="Max Extension (days) *">
              <input
                value={form.maxExtension}
                onChange={set("maxExtension")}
                type="number"
                min="0"
                step="1"
                required
                className={inputCls}
                placeholder="7"
              />
            </Field>
          </div>

          <Field label="Your Phone Number *">
            <input
              value={form.ownerPhone}
              onChange={set("ownerPhone")}
              type="tel"
              required
              className={inputCls}
              placeholder="+91 98765 43210"
            />
          </Field>

          {/* Location / pickup address */}
          <Field label="Pickup / Return Address">
            <input
              value={form.location ?? ""}
              onChange={set("location")}
              className={inputCls}
              placeholder="e.g. Connaught Place, New Delhi, 110001"
            />
          </Field>

          <Field label="Description (off-chain)">
            <textarea
              value={form.description}
              onChange={set("description")}
              rows={3}
              className={inputCls + " resize-none"}
              placeholder="Describe the asset, usage terms, etc."
            />
          </Field>

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Create Listing
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[var(--text-muted)]">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl bg-[var(--surface-soft)] border border-[var(--border-soft)] text-[var(--text-strong)] text-sm px-3.5 py-2.5 placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-violet-500/60 focus:bg-violet-500/5 transition-all";
