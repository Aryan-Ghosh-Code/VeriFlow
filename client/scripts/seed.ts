// =============================================================================
// VeriFlow Protocol – Database Seed Script
// =============================================================================
// Run once to populate MongoDB Atlas with demo listings and activity events.
//
// Usage:
//   npx ts-node --skip-project scripts/seed.ts
//
// Requires MONGODB_URI in a .env.local file in the project root.
// =============================================================================

import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI is not set. Create .env.local with your Atlas URI.");
  process.exit(1);
}

// ─── Inline schemas (avoid circular imports) ──────────────────────────────────

const ListingSchema = new mongoose.Schema(
  {
    chainId:     { type: String, sparse: true },
    owner:       { type: String, required: true, lowercase: true },
    assetName:   { type: String, required: true },
    description: { type: String, default: "" },
    assetValue:  { type: String, required: true },
    imageUrl:    { type: String },
    category:    { type: String, default: "Other" },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ActivityEventSchema = new mongoose.Schema(
  {
    walletAddress: { type: String, required: true },
    eventType:     { type: String, required: true },
    message:       { type: String, required: true },
    ethValue:      { type: String },
    trustDelta:    { type: Number },
    txHash:        { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const Listing =
  mongoose.models.Listing ?? mongoose.model("Listing", ListingSchema);
const ActivityEvent =
  mongoose.models.ActivityEvent ?? mongoose.model("ActivityEvent", ActivityEventSchema);

// ─── Seed Data ────────────────────────────────────────────────────────────────

const DEMO_LISTINGS = [
  {
    owner:       "0xb12e3fab0000000000000000000000000000001a",
    assetName:   "DSLR Camera Kit",
    description: "Canon EOS 5D Mark IV with 24-70mm f/2.8 lens, 2 batteries, and carry bag. Perfect for weddings and events.",
    assetValue:  "2.8",
    category:    "Photography",
    isActive:    true,
  },
  {
    owner:       "0x7a3f9dcc0000000000000000000000000000002b",
    assetName:   "DJI Drone Pro Max",
    description: "Professional-grade drone with 4K camera, 3-axis gimbal, and 30-min flight time. Ideal for aerial photography.",
    assetValue:  "1.5",
    category:    "Electronics",
    isActive:    true,
  },
  {
    owner:       "0xe7f32d900000000000000000000000000000003c",
    assetName:   "MacBook Pro M3 Max",
    description: "16-inch MacBook Pro M3 Max. 36GB RAM, 1TB SSD. Perfect for video editing and software development.",
    assetValue:  "1.5",
    category:    "Computing",
    isActive:    true,
  },
  {
    owner:       "0x3c887e100000000000000000000000000000004d",
    assetName:   "DJI Ronin 4D Cinema Camera",
    description: "Full-frame cinema camera with built-in 3-axis LiDAR stabilization. Everything a cinematographer needs.",
    assetValue:  "4.2",
    category:    "Photography",
    isActive:    true,
  },
  {
    owner:       "0xf90a1c2d0000000000000000000000000000005e",
    assetName:   "Sony A7 IV Mirrorless",
    description: "Full-frame mirrorless body with 33MP sensor. Includes 24-70mm GM lens, dual batteries and Peak Design bag.",
    assetValue:  "0.9",
    category:    "Photography",
    isActive:    true,
  },
  {
    owner:       "0xd4a15b390000000000000000000000000000006f",
    assetName:   "iPad Pro M4 12.9\"",
    description: "Latest iPad Pro with Apple Pencil Pro and Magic Keyboard. Excellent for design and presentations.",
    assetValue:  "0.6",
    category:    "Electronics",
    isActive:    true,
  },
];

const DEMO_ACTIVITY: Array<{
  walletAddress: string;
  eventType: string;
  message: string;
  ethValue?: string;
  trustDelta?: number;
}> = [
  {
    walletAddress: "0x7a3f…9dcc",
    eventType:     "rental_completed",
    message:       "✓ 0x7a3f…9dcc just completed a rental · +10 trust · 0.4 ETH unlocked",
    ethValue:      "0.4 ETH",
    trustDelta:    10,
  },
  {
    walletAddress: "0xb12e…3fab",
    eventType:     "listing_created",
    message:       "✓ 0xb12e…3fab listed a DSLR Camera Kit · 2.8 ETH value",
    ethValue:      "2.8 ETH",
  },
  {
    walletAddress: "0xf90a…1c2d",
    eventType:     "tier_upgraded",
    message:       "✓ 0xf90a…1c2d earned Gold Tier · 80% deposit savings unlocked",
    trustDelta:    0,
  },
  {
    walletAddress: "0x3c88…7e10",
    eventType:     "rental_started",
    message:       "✓ 0x3c88…7e10 rented a DJI Drone · saved 1.2 ETH in deposit",
    ethValue:      "1.2 ETH",
  },
  {
    walletAddress: "0xd4a1…5b39",
    eventType:     "trust_gained",
    message:       "✓ 0xd4a1…5b39 completed 5th rental · trust score now 650",
    trustDelta:    10,
  },
  {
    walletAddress: "0x8f2c…aa71",
    eventType:     "rental_started",
    message:       "✓ 0x8f2c…aa71 started rental · 0x5e01…4b2a approved in 2.1s",
  },
  {
    walletAddress: "0x1ba9…cc32",
    eventType:     "tier_upgraded",
    message:       "✓ 0x1ba9…cc32 reached Silver Tier · 60% max savings",
  },
  {
    walletAddress: "0xe7f3…2d90",
    eventType:     "listing_created",
    message:       "✓ 0xe7f3…2d90 just listed a Macbook Pro · 1.5 ETH value",
    ethValue:      "1.5 ETH",
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🔌 Connecting to MongoDB…");
  await mongoose.connect(MONGODB_URI!);
  console.log("✅ Connected\n");

  // Clear existing seed data (idempotent)
  await Listing.deleteMany({});
  await ActivityEvent.deleteMany({});
  console.log("🗑  Cleared existing data\n");

  // Insert listings
  const insertedListings = await Listing.insertMany(DEMO_LISTINGS);
  console.log(`📦 Inserted ${insertedListings.length} listings:`);
  insertedListings.forEach((l: mongoose.Document & { assetName?: string }) =>
    console.log(`   • ${l._id}  →  ${l.assetName}`)
  );

  // Insert activity events
  const insertedEvents = await ActivityEvent.insertMany(DEMO_ACTIVITY);
  console.log(`\n📡 Inserted ${insertedEvents.length} activity events:`);
  insertedEvents.forEach((e: mongoose.Document & { message?: string }) =>
    console.log(`   • ${e._id}  →  ${e.message}`)
  );

  console.log("\n✅ Seed complete!");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
