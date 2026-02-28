// =============================================================================
// CollateralX Protocol – Create Listing Form
// =============================================================================

"use client";

import React, { useState, useRef } from "react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/store/useAppStore";
import { useListings } from "@/hooks/useListings";
import { getSigner } from "@/lib/ethers";
import { getContractWrite } from "@/lib/contract";
import { ethToWei } from "@/lib/utils";

interface FormData {
  assetName: string;
  assetValue: string;
  description: string;
  imageUrl: string;
}

const EMPTY: FormData = { assetName: "", assetValue: "", description: "", imageUrl: "" };

export function CreateListingForm() {
  const [form, setForm]       = useState<FormData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { walletAddress, addToast } = useAppStore();
  const { optimisticAdd, refetch }  = useListings();

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setForm((prev) => ({ ...prev, imageUrl: url }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) return addToast({ type: "error", message: "Connect wallet first." });
    if (!form.assetName || !form.assetValue) return addToast({ type: "error", message: "Fill required fields." });

    setLoading(true);
    const toastId = addToast({ type: "loading", message: "Creating listing…" });

    // Optimistic update
    optimisticAdd({
      assetName:   form.assetName,
      description: form.description,
      assetValue:  form.assetValue,
      owner:       walletAddress,
      imageUrl:    form.imageUrl || undefined,
    });

    try {
      const signer   = await getSigner();
      const contract = getContractWrite(signer);
      const valueWei = ethToWei(form.assetValue);
      const tx = await contract.createListing(form.assetName, form.description, valueWei);
      await tx.wait();
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
        <h2 className="text-base font-semibold text-white">Create Listing</h2>
        <p className="text-xs text-white/40 mt-0.5">Add an asset available for rental</p>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image preview */}
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

          <Field label="Asset Name *" placeholder="e.g. DJI Drone Pro">
            <input
              value={form.assetName}
              onChange={set("assetName")}
              required
              className={inputCls}
              placeholder="e.g. DJI Drone Pro"
            />
          </Field>

          <Field label="Asset Value (ETH) *" placeholder="">
            <input
              value={form.assetValue}
              onChange={set("assetValue")}
              type="number"
              step="0.001"
              min="0"
              required
              className={inputCls}
              placeholder="0.5"
            />
          </Field>

          <Field label="Description" placeholder="">
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

function Field({ label, children }: { label: string; children: React.ReactNode; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-white/50">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl bg-white/4 border border-white/8 text-white text-sm px-3.5 py-2.5 placeholder:text-white/20 focus:outline-none focus:border-violet-500/60 focus:bg-violet-500/5 transition-all";
