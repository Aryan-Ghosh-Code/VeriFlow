// =============================================================================
// CollateralX Protocol – API: /api/listings/[id]
// GET    → fetch a single listing by MongoDB _id or chainId
// PATCH  → update listing (e.g. mark inactive, set chainId after tx confirms)
// DELETE → soft-delete (sets isActive = false)
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Listing from "@/models/Listing";

// ─── GET /api/listings/[id] ──────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    // Support lookup by MongoDB ObjectId OR by chainId
    const isObjectId = mongoose.isValidObjectId(id);
    const listing = isObjectId
      ? await Listing.findById(id).lean()
      : await Listing.findOne({ chainId: id }).lean();

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json({
      id:          listing._id.toString(),
      chainId:     listing.chainId ?? null,
      owner:       listing.owner,
      assetName:   listing.assetName,
      description: listing.description,
      assetValue:  listing.assetValue,
      imageUrl:    listing.imageUrl ?? null,
      category:    listing.category,
      isActive:    listing.isActive,
      createdAt:   Math.floor(new Date(listing.createdAt).getTime() / 1000),
    });
  } catch (err) {
    console.error("[GET /api/listings/[id]]", err);
    return NextResponse.json(
      { error: "Failed to fetch listing" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/listings/[id] ────────────────────────────────────────────────
// Used to attach the on-chain chainId after a transaction confirms,
// or to update imageUrl, description, etc.

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    // Whitelist updatable fields
    const allowed = ["chainId", "assetName", "description", "imageUrl", "category", "isActive"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    const listing = await Listing.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json({
      id:          listing._id.toString(),
      chainId:     listing.chainId ?? null,
      owner:       listing.owner,
      assetName:   listing.assetName,
      description: listing.description,
      assetValue:  listing.assetValue,
      imageUrl:    listing.imageUrl ?? null,
      category:    listing.category,
      isActive:    listing.isActive,
      createdAt:   Math.floor(new Date(listing.createdAt).getTime() / 1000),
    });
  } catch (err) {
    console.error("[PATCH /api/listings/[id]]", err);
    return NextResponse.json(
      { error: "Failed to update listing" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/listings/[id] ───────────────────────────────────────────────
// Soft-delete only — we never hard-delete listings since they may have
// on-chain history tied to them.

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const listing = await Listing.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    ).lean();

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("[DELETE /api/listings/[id]]", err);
    return NextResponse.json(
      { error: "Failed to deactivate listing" },
      { status: 500 }
    );
  }
}
