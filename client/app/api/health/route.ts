// =============================================================================
// CollateralX Protocol – API: /api/health
// Quick connectivity test for MongoDB. Hit this endpoint in the browser
// to see if the DB connection works.
// =============================================================================

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

export async function GET() {
  try {
    await connectDB();
    return NextResponse.json({ ok: true, db: "connected" }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
