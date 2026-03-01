// =============================================================================
// VeriFlow Protocol – API: /api/activity
// GET  → latest N activity events for the landing page marquee ticker
// POST → create a new activity event (called by backend/webhook after tx)
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import ActivityEvent from "@/models/ActivityEvent";

// ─── GET /api/activity ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

    const events = await ActivityEvent.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const serialized = events.map((e) => ({
      id:            e._id.toString(),
      walletAddress: e.walletAddress,
      eventType:     e.eventType,
      message:       e.message,
      ethValue:      e.ethValue ?? null,
      trustDelta:    e.trustDelta ?? null,
      txHash:        e.txHash ?? null,
      createdAt:     new Date(e.createdAt).toISOString(),
    }));

    return NextResponse.json(serialized, { status: 200 });
  } catch (err) {
    console.error("[GET /api/activity]", err);
    return NextResponse.json(
      { error: "Failed to fetch activity events" },
      { status: 500 }
    );
  }
}

// ─── POST /api/activity ───────────────────────────────────────────────────────
// Called by internal handlers when a contract event fires.

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { walletAddress, eventType, message, ethValue, trustDelta, txHash } = body;

    if (!walletAddress || !eventType || !message) {
      return NextResponse.json(
        { error: "walletAddress, eventType, and message are required" },
        { status: 400 }
      );
    }

    const event = await ActivityEvent.create({
      walletAddress,
      eventType,
      message,
      ethValue:   ethValue   ?? undefined,
      trustDelta: trustDelta ?? undefined,
      txHash:     txHash     ?? undefined,
    });

    return NextResponse.json(
      {
        id:            event._id.toString(),
        walletAddress: event.walletAddress,
        eventType:     event.eventType,
        message:       event.message,
        ethValue:      event.ethValue ?? null,
        trustDelta:    event.trustDelta ?? null,
        txHash:        event.txHash ?? null,
        createdAt:     event.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/activity]", err);
    return NextResponse.json(
      { error: "Failed to create activity event" },
      { status: 500 }
    );
  }
}
