// =============================================================================
// CollateralX Protocol – Listing Mongoose Model
// =============================================================================
// MongoDB is the UI source of truth for listing metadata.
// On-chain data (deposit amount, rental status, escrow) lives in the contract.
// =============================================================================

import mongoose, { Document, Model, Schema } from "mongoose";

// ─── TypeScript Interface ─────────────────────────────────────────────────────

export interface IListing extends Document {
  /** On-chain listing ID (from smart contract). Null if not yet synced. */
  chainId?: string;
  /** Wallet address of the lister (lowercase) */
  owner: string;
  assetName: string;
  description: string;
  /** Asset value in ETH (as a string to avoid float precision issues) */
  assetValue: string;
  imageUrl?: string;
  /** High-level category for filtering */
  category: "Electronics" | "Photography" | "Computing" | "Transport" | "Other";
  /** Physical pickup/return address */
  location?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const ListingSchema = new Schema<IListing>(
  {
    chainId: {
      type: String,
      sparse: true, // allows multiple nulls
      index: true,
    },
    owner: {
      type: String,
      required: [true, "Owner wallet address is required"],
      lowercase: true,
      trim: true,
      index: true,
    },
    assetName: {
      type: String,
      required: [true, "Asset name is required"],
      trim: true,
      maxlength: [120, "Asset name must be ≤ 120 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description must be ≤ 1000 characters"],
      default: "",
    },
    assetValue: {
      type: String,
      required: [true, "Asset value (in ETH) is required"],
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ["Electronics", "Photography", "Computing", "Transport", "Other"],
      default: "Other",
    },
    location: {
      type: String,
      trim: true,
      maxlength: [300, "Location must be ≤ 300 characters"],
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true, // auto-manages createdAt + updatedAt
  }
);

// ─── Model (singleton-safe for Next.js hot-reload) ────────────────────────────

const Listing: Model<IListing> =
  mongoose.models.Listing ?? mongoose.model<IListing>("Listing", ListingSchema);

export default Listing;
