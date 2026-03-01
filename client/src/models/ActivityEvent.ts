// =============================================================================
// VeriFlow Protocol – ActivityEvent Mongoose Model
// =============================================================================
// Stores on-chain events as human-readable ticker entries for the landing
// page marquee. Written by backend listeners or API handlers whenever a
// significant contract event fires.
// =============================================================================

import mongoose, { Document, Model, Schema } from "mongoose";

// ─── TypeScript Interface ─────────────────────────────────────────────────────

export type ActivityEventType =
  | "listing_created"   // A new listing was posted
  | "rental_started"    // A renter started a rental
  | "rental_completed"  // A rental was completed, deposit released
  | "tier_upgraded"     // A user crossed a trust tier threshold
  | "trust_gained"      // Trust score increased after successful rental
  | "trust_lost";       // Trust score dropped after dispute

export interface IActivityEvent extends Document {
  /** Truncated wallet address shown in the ticker, e.g. "0xb12e…3fab" */
  walletAddress: string;
  eventType: ActivityEventType;
  /** Full human-readable ticker string, e.g. "✓ 0xb12e…3fab listed a DSLR…" */
  message: string;
  /** ETH amount involved, if any (e.g. "2.8 ETH") */
  ethValue?: string;
  /** Change in trust score, e.g. +10 or -20 */
  trustDelta?: number;
  /** On-chain tx hash for verifiability */
  txHash?: string;
  createdAt: Date;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const ActivityEventSchema = new Schema<IActivityEvent>(
  {
    walletAddress: {
      type: String,
      required: [true, "Wallet address is required"],
      trim: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        "listing_created",
        "rental_started",
        "rental_completed",
        "tier_upgraded",
        "trust_gained",
        "trust_lost",
      ],
      index: true,
    },
    message: {
      type: String,
      required: [true, "Ticker message is required"],
      trim: true,
      maxlength: [200, "Message must be ≤ 200 characters"],
    },
    ethValue: {
      type: String,
    },
    trustDelta: {
      type: Number,
    },
    txHash: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // we only need createdAt
  }
);

// Index for fast "latest N events" queries
ActivityEventSchema.index({ createdAt: -1 });

// ─── Model (singleton-safe for Next.js hot-reload) ────────────────────────────

const ActivityEvent: Model<IActivityEvent> =
  mongoose.models.ActivityEvent ??
  mongoose.model<IActivityEvent>("ActivityEvent", ActivityEventSchema);

export default ActivityEvent;
