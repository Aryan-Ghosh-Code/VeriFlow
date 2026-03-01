// =============================================================================
// VeriFlow Protocol – Zustand Global Store
// =============================================================================

"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Listing, ActiveRental, RentalReceipt, TrustTier } from "@/types/rental";
import { getTrustTier } from "@/lib/utils";
import { TRUST_SCORE_INITIAL } from "@/config";

// ─── Toast ────────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "info" | "loading";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface AppState {
  // Wallet
  walletAddress: string | null;
  isConnecting: boolean;
  isCheckingWallet: boolean;

  // Trust
  trustScore: number;
  trustTier: TrustTier;

  // Data
  listings: Listing[];
  activeRentals: ActiveRental[];

  // UI
  toasts: Toast[];
  pendingReceipt: RentalReceipt | null;

  // ── Actions ────────────────────────────────────────────────────────────────

  setWallet: (address: string | null) => void;
  setConnecting: (v: boolean) => void;
  setCheckingWallet: (v: boolean) => void;

  setTrustScore: (score: number) => void;

  setListings: (listings: Listing[]) => void;
  addListingOptimistic: (listing: Listing) => void;

  setActiveRentals: (rentals: ActiveRental[]) => void;
  addRentalOptimistic: (rental: ActiveRental) => void;

  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;

  setPendingReceipt: (receipt: RentalReceipt | null) => void;

  reset: () => void;
}

// ─── Initial State ────────────────────────────────────────────────────────────

const INITIAL_TRUST = TRUST_SCORE_INITIAL;

const initialState = {
  walletAddress: null,
  isConnecting: false,
  isCheckingWallet: true,
  trustScore: INITIAL_TRUST,
  trustTier: getTrustTier(INITIAL_TRUST),
  listings: [],
  activeRentals: [],
  toasts: [],
  pendingReceipt: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      ...initialState,

      setWallet: (address) =>
        set({ walletAddress: address }, false, "setWallet"),

      setConnecting: (v) =>
        set({ isConnecting: v }, false, "setConnecting"),

      setCheckingWallet: (v) =>
        set({ isCheckingWallet: v }, false, "setCheckingWallet"),

      setTrustScore: (score) =>
        set(
          { trustScore: score, trustTier: getTrustTier(score) },
          false,
          "setTrustScore"
        ),

      setListings: (listings) =>
        set({ listings }, false, "setListings"),

      addListingOptimistic: (listing) =>
        set(
          (s) => ({ listings: [listing, ...s.listings] }),
          false,
          "addListingOptimistic"
        ),

      setActiveRentals: (rentals) =>
        set({ activeRentals: rentals }, false, "setActiveRentals"),

      addRentalOptimistic: (rental) =>
        set(
          (s) => ({ activeRentals: [rental, ...s.activeRentals] }),
          false,
          "addRentalOptimistic"
        ),

      addToast: (toast) => {
        const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
        set(
          (s) => ({ toasts: [...s.toasts, { ...toast, id }] }),
          false,
          "addToast"
        );
        // auto-dismiss after duration (default 4 s, unless loading)
        if (toast.type !== "loading") {
          const dur = toast.duration ?? 4000;
          setTimeout(() => {
            set(
              (s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }),
              false,
              "removeToast/auto"
            );
          }, dur);
        }
        return id;
      },

      removeToast: (id) =>
        set(
          (s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }),
          false,
          "removeToast"
        ),

      setPendingReceipt: (receipt) =>
        set({ pendingReceipt: receipt }, false, "setPendingReceipt"),

      reset: () =>
        set({ ...initialState, isCheckingWallet: false }, false, "reset"),
    }),
    { name: "VeriFlow" }
  )
);
