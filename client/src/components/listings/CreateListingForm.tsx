// =============================================================================
// VeriFlow Protocol – Create Listing Form
// =============================================================================
// Asset Value + Rental Fee: user inputs in INR → shows ETH equivalent below.
// Phone: must be exactly 10 digits.
// =============================================================================

"use client";

import React, { useState, useRef } from "react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { useAppStore } from "@/store/useAppStore";
import { useListings } from "@/hooks/useListings";
import { getSigner, getReadProvider } from "@/lib/ethers";
import { getContractWrite, getContractRead } from "@/lib/contract";
import { ethToWei } from "@/lib/utils";
import { ETH_TO_INR } from "@/config";

// ── helpers ──────────────────────────────────────────────────────────────────

/** Convert INR amount (number) to ETH string, rounded to 6 decimal places */
function inrToEth(inr: number): number {
  return inr / ETH_TO_INR;
}

function ethDisplay(inr: string): string | null {
  const n = parseFloat(inr);
  if (!n || isNaN(n) || n <= 0) return null;
  const eth = inrToEth(n);
  return eth < 0.000001 ? "< 0.000001 ETH" : `${eth.toFixed(6)} ETH`;
}

/** Validate 10-digit numeric phone */
function isValidPhone(val: string): boolean {
  return /^\d{10}$/.test(val.trim());
}

interface FormData {
  assetName: string;
  assetValueInr: string;       // ← user types INR
  description: string;
  imageUrl: string;
  rentalFeePerDayInr: string;  // ← user types INR
  minDuration: string;   // in days
  maxExtension: string;  // in days
  ownerPhone: string;
  location: string;
}

const EMPTY: FormData = {
  assetName: "",
  assetValueInr: "",
  description: "",
  imageUrl: "",
  rentalFeePerDayInr: "",
  minDuration: "1",
  maxExtension: "7",
  ownerPhone: "",
  location: "",
};

export function CreateListingForm() {
  const [form, setForm]       = useState<FormData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false); // image uploading to Cloudinary
  const [preview, setPreview] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { walletAddress, addToast } = useAppStore();
  const { optimisticAdd, saveListing, refetch } = useListings();

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (key === "ownerPhone") setPhoneError(null); // clear error on type
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      // Replace blob URL with permanent Cloudinary URL
      setForm((prev) => ({ ...prev, imageUrl: data.url }));
    } catch (err: unknown) {
      addToast({ type: "error", message: err instanceof Error ? err.message : "Image upload failed." });
      setPreview(null);
      setForm((prev) => ({ ...prev, imageUrl: "" }));
    } finally {
      setUploading(false);
    }
  };

  // Live ETH previews
  const assetValueEthDisplay   = ethDisplay(form.assetValueInr);
  const rentalFeeEthDisplay    = ethDisplay(form.rentalFeePerDayInr);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) return addToast({ type: "error", message: "Connect wallet first." });
    if (!form.assetName || !form.assetValueInr || !form.rentalFeePerDayInr)
      return addToast({ type: "error", message: "Fill all required fields." });
    if (uploading)
      return addToast({ type: "error", message: "Please wait — image is still uploading." });

    // Phone validation
    if (!isValidPhone(form.ownerPhone)) {
      setPhoneError("Phone must be exactly 10 digits (numbers only).");
      return addToast({ type: "error", message: "Phone must be exactly 10 digits." });
    }

    // Convert INR → ETH for on-chain submission
    const assetValueEth     = inrToEth(parseFloat(form.assetValueInr));
    const rentalFeePerDayEth = inrToEth(parseFloat(form.rentalFeePerDayInr));

    setLoading(true);
    const toastId = addToast({ type: "loading", message: "Creating listing…" });

    // Optimistic UI update (MongoDB metadata)
    optimisticAdd({
      assetName:   form.assetName,
      description: form.description,
      assetValue:  assetValueEth.toString(),
      owner:       walletAddress,
      imageUrl:    form.imageUrl || undefined,
      location:    form.location || undefined,
    });

    try {
      // ── On-chain transaction ──────────────────────────────────────────────
      const signer   = await getSigner();
      const contract = getContractWrite(signer);

      const valueWei      = ethToWei(assetValueEth);
      const feePerDayWei  = ethToWei(rentalFeePerDayEth);
      const minDurSec     = BigInt(Math.round(Number(form.minDuration) * 86400));
      const maxExtSec     = BigInt(Math.round(Number(form.maxExtension) * 86400));

      const tx = await contract.createListing(
        form.assetName,
        valueWei,
        minDurSec,
        maxExtSec,
        feePerDayWei,
        form.ownerPhone.trim(),
        form.location,
        { gasLimit: BigInt(500_000) },
      );
      await tx.wait();

      // Read the new on-chain listing ID immediately after confirmation
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
        assetValue:  assetValueEth.toString(),
        imageUrl:    form.imageUrl || undefined,
        location:    form.location || undefined,
        chainId,
      });

      useAppStore.getState().removeToast(toastId);
      addToast({ type: "success", message: `Listing "${form.assetName}" created!` });
      setForm(EMPTY);
      setPreview(null);
      setPhoneError(null);
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
            onClick={() => !uploading && fileRef.current?.click()}
            className="relative h-52 rounded-xl border border-dashed border-white/10 bg-white/2 cursor-pointer hover:border-violet-500/50 hover:bg-violet-500/5 transition-all overflow-hidden flex items-center justify-center"
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
            {/* Upload progress overlay */}
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                <span className="h-6 w-6 rounded-full border-2 border-white/20 border-t-violet-400 animate-spin" />
                <p className="text-xs text-white/70">Uploading to Cloudinary…</p>
              </div>
            )}
            {/* Uploaded checkmark */}
            {!uploading && form.imageUrl && (
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500/90 flex items-center justify-center">
                <span className="text-white text-xs font-bold">✓</span>
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

          {/* Asset Value in INR → shows ETH */}
          <Field label="Asset Value (₹ INR) *">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-white/40">₹</span>
              <input
                value={form.assetValueInr}
                onChange={set("assetValueInr")}
                type="number"
                step="1"
                min="1"
                required
                className={inputCls + " pl-7 pr-4"}
                placeholder="1,25,000"
              />
            </div>
            {assetValueEthDisplay && (
              <p className="text-[11px] text-emerald-400/80 mt-1 pl-1">≈ {assetValueEthDisplay}</p>
            )}
          </Field>

          {/* Rental Fee in INR → shows ETH */}
          <Field label="Rental Fee / Day (₹ INR) *">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-white/40">₹</span>
              <input
                value={form.rentalFeePerDayInr}
                onChange={set("rentalFeePerDayInr")}
                type="number"
                step="1"
                min="1"
                required
                className={inputCls + " pl-7 pr-4"}
                placeholder="2,500"
              />
            </div>
            {rentalFeeEthDisplay && (
              <p className="text-[11px] text-emerald-400/80 mt-1 pl-1">≈ {rentalFeeEthDisplay}</p>
            )}
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

          {/* Phone — 10 digits required */}
          <Field label="Your Phone Number *">
            <input
              value={form.ownerPhone}
              onChange={set("ownerPhone")}
              type="tel"
              inputMode="numeric"
              maxLength={10}
              required
              className={`${inputCls} ${phoneError ? "border-red-500/60 focus:border-red-500/80" : ""}`}
              placeholder="9876543210"
            />
            {phoneError ? (
              <p className="text-[11px] text-red-400 mt-1 pl-1">{phoneError}</p>
            ) : (
              <p className="text-[11px] text-white/25 mt-1 pl-1">10-digit number, no spaces or dashes</p>
            )}
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

          <button
            type="submit"
            disabled={loading}
            className="relative w-full overflow-hidden rounded-xl px-6 py-3.5 text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 group border border-violet-500/40 hover:border-violet-400/70 backdrop-blur-md"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(79,70,229,0.15) 50%, rgba(8,145,178,0.1) 100%)",
              boxShadow: "0 0 20px rgba(124,58,237,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            {/* Glass inner highlight */}
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            {/* Shimmer sweep on hover */}
            <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
            {/* Hover glow fill */}
            <span className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.2) 0%, transparent 70%)" }} />
            <span className="relative flex items-center justify-center gap-2 drop-shadow-sm">
              {loading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-violet-300/40 border-t-violet-300 animate-spin" />
                  <span className="text-violet-200">Creating…</span>
                </>
              ) : (
                <>
                  <span className="text-violet-300 text-base leading-none">✦</span>
                  <span className="bg-gradient-to-r from-violet-200 via-white to-cyan-200 bg-clip-text text-transparent">
                    Create Listing
                  </span>
                </>
              )}
            </span>
          </button>
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
