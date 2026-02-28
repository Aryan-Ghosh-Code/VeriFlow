// =============================================================================
// CollateralX Protocol – MongoDB Connection Singleton
// =============================================================================
// Uses a custom DNS resolver (Google 8.8.8.8) to resolve MongoDB Atlas SRV
// records, bypassing Windows ISP DNS that refuses querySrv lookups.
// =============================================================================

import { Resolver } from "dns/promises";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error(
    "Please define MONGODB_URI in .env.local"
  );
}

// ---------------------------------------------------------------------------
// SRV resolver — converts mongodb+srv:// → mongodb:// using Google DNS.
// This bypasses the system DNS that returns ECONNREFUSED on SRV lookups.
// ---------------------------------------------------------------------------

async function srvToDirectUri(srvUri: string): Promise<string> {
  const url = new URL(srvUri);
  const atlasHost = url.hostname; // e.g. cluster0.u3pk5ro.mongodb.net

  // Use Google Public DNS — guaranteed to support SRV records
  const resolver = new Resolver();
  resolver.setServers(["8.8.8.8:53", "1.1.1.1:53"]);

  // 1. Resolve SRV records → get individual shard hosts + ports
  const srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${atlasHost}`);
  const hosts = srvRecords
    .sort((a, b) => a.priority - b.priority || a.weight - b.weight)
    .map((r) => `${r.name}:${r.port}`)
    .join(",");

  // 2. Resolve TXT record → get authSource + replicaSet
  let extraOpts = "authSource=admin";
  try {
    const txtRecords = await resolver.resolveTxt(atlasHost);
    const flat = txtRecords.flat().join("&");
    if (flat) extraOpts = flat;
  } catch {
    /* use default authSource=admin */
  }

  // 3. Preserve user credentials + database from original URI
  const userInfo =
    url.username
      ? `${encodeURIComponent(decodeURIComponent(url.username))}:${encodeURIComponent(decodeURIComponent(url.password))}@`
      : "";
  const dbPath = url.pathname || "/";
  // Forward any query params the user put in the original URI (minus retryWrites etc)
  const forwardedParams = url.searchParams.toString();
  const allParams = [forwardedParams, extraOpts, "tls=true"]
    .filter(Boolean)
    .join("&");

  const directUri = `mongodb://${userInfo}${hosts}${dbPath}?${allParams}`;
  console.log(`[MongoDB] Resolved SRV → direct URI for ${atlasHost}`);
  return directUri;
}

// ---------------------------------------------------------------------------
// Connection singleton
// ---------------------------------------------------------------------------

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalWithMongoose = global as typeof globalThis & {
  _mongooseCache?: MongooseCache;
};

if (!globalWithMongoose._mongooseCache) {
  globalWithMongoose._mongooseCache = { conn: null, promise: null };
}

const cached = globalWithMongoose._mongooseCache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = (async () => {
      let uri = MONGODB_URI;

      // If using SRV protocol, resolve to a direct URI using our custom resolver
      if (MONGODB_URI.startsWith("mongodb+srv://")) {
        try {
          uri = await srvToDirectUri(MONGODB_URI);
        } catch (err) {
          console.warn(
            "[MongoDB] SRV resolution via Google DNS failed, falling back to original URI:",
            err
          );
          // Fall back to original — may still fail if system DNS is broken
        }
      }

      return mongoose
        .connect(uri, {
          bufferCommands: false,
          family: 4, // Force IPv4 TCP connections
        })
        .then((m) => {
          console.log("✅ MongoDB connected");
          return m;
        });
    })().catch((err) => {
      cached.promise = null; // Allow retry on next request
      throw err;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
