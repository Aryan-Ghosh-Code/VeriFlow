// =============================================================================
// VeriFlow Protocol – API: /api/upload
// POST → accepts a multipart file, uploads to Cloudinary, returns { url }
// =============================================================================
// Uses the Cloudinary REST API directly (no SDK dependency needed).
// Signed with CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET server-side.
// The browser never sees the secret.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const CLOUD_NAME  = process.env.CLOUDINARY_CLOUD_NAME!;
const API_KEY     = process.env.CLOUDINARY_API_KEY!;
const API_SECRET  = process.env.CLOUDINARY_API_SECRET!;

export async function POST(req: NextRequest) {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return NextResponse.json(
      { error: "Cloudinary env vars not configured." },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // Build signed upload parameters
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder    = "veriflow_listings";

    // Signature: sha1 of "folder=<f>&timestamp=<t><secret>"
    const toSign  = `folder=${folder}&timestamp=${timestamp}${API_SECRET}`;
    const signature = crypto.createHash("sha1").update(toSign).digest("hex");

    // Build multipart body for Cloudinary REST API
    const body = new FormData();
    body.append("file",      file);
    body.append("api_key",   API_KEY);
    body.append("timestamp", timestamp);
    body.append("signature", signature);
    body.append("folder",    folder);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body }
    );

    if (!res.ok) {
      const err = await res.json();
      console.error("[/api/upload] Cloudinary error:", err);
      return NextResponse.json(
        { error: err.error?.message ?? "Cloudinary upload failed." },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json({ url: data.secure_url as string }, { status: 200 });
  } catch (err) {
    console.error("[/api/upload]", err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
