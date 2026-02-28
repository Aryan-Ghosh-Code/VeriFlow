// =============================================================================
// CollateralX Protocol – API: /api/listings
// GET  → returns all active listings (MongoDB source of truth)
// POST → creates a new listing document
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Listing from "@/models/Listing";

// ─── GET /api/listings ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const owner    = searchParams.get("owner");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { isActive: true };
    if (category) filter.category = category;
    if (owner)    filter.owner    = owner.toLowerCase();

    const listings = await Listing.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // Serialize _id → id for the frontend
    const serialized = listings.map((l) => ({
      id:          l._id.toString(),
      chainId:     l.chainId ?? null,
      owner:       l.owner,
      assetName:   l.assetName,
      description: l.description,
      assetValue:  l.assetValue,
      imageUrl:    l.imageUrl ?? null,
      category:    l.category,
      location:    l.location ?? "",
      isActive:    l.isActive,
      createdAt:   Math.floor(new Date(l.createdAt).getTime() / 1000),
    }));

    return NextResponse.json(serialized, { status: 200 });
  } catch (err) {
    console.error("[GET /api/listings]", err);
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    );
  }
}

// ─── POST /api/listings ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { owner, assetName, description, assetValue, imageUrl, category, chainId, location } = body;

    // Basic validation
    if (!owner || !assetName || !assetValue) {
      return NextResponse.json(
        { error: "owner, assetName, and assetValue are required" },
        { status: 400 }
      );
    }

    const listing = await Listing.create({
      chainId:     chainId    ?? undefined,
      owner:       owner.toLowerCase(),
      assetName:   assetName.trim(),
      description: description?.trim() ?? "",
      assetValue:  String(assetValue),
      imageUrl:    imageUrl   ?? undefined,
      category:    category   ?? "Other",
      location:    location?.trim() ?? "",
      isActive:    true,
    });

    return NextResponse.json(
      {
        id:          listing._id.toString(),
        chainId:     listing.chainId ?? null,
        owner:       listing.owner,
        assetName:   listing.assetName,
        description: listing.description,
        assetValue:  listing.assetValue,
        imageUrl:    listing.imageUrl ?? null,
        category:    listing.category,
        location:    listing.location ?? "",
        isActive:    listing.isActive,
        createdAt:   Math.floor(listing.createdAt.getTime() / 1000),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/listings]", err);
    return NextResponse.json(
      { error: "Failed to create listing" },
      { status: 500 }
    );
  }
}
