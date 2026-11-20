import type { NextConfig } from "next";
import os from "os";
import path from "path";
import fs from "fs";
import { parseEnv } from "util";

/**
 * Also read the monorepo-root .env (one file for both apps). Only fills
 * variables that aren't set yet, so app-level .env files and Netlify's
 * dashboard values always win. (@next/env can't be used here: Next has
 * already called it and it returns a cached result.)
 */
function loadRootEnv() {
  const file = path.join(__dirname, "../../.env");
  if (!fs.existsSync(file) || typeof parseEnv !== "function") return;
  for (const [key, value] of Object.entries(parseEnv(fs.readFileSync(file, "utf8")))) {
    if (process.env[key] === undefined || process.env[key] === "") process.env[key] = value;
  }
}
loadRootEnv();

function lanHosts(): string[] {
  const hosts = new Set<string>();
  for (const nets of Object.values(os.networkInterfaces())) {
    for (const net of nets ?? []) {
      if (net.family === "IPv4" && !net.internal) hosts.add(net.address);
    }
  }
  hosts.add("192.168.0.176");
  return [...hosts];
}

const nextConfig: NextConfig = {
  // Standalone is for Docker/self-host; Netlify OpenNext handles the deploy runtime.
  ...(process.env.NETLIFY ? {} : { output: "standalone" as const }),
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // Lets a test build go to another folder (NEXT_DIST_DIR=.next-check) without disturbing a running dev server.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  transpilePackages: ["@dht/ui", "@dht/api-client", "@dht/types"],
  allowedDevOrigins: lanHosts(),
  /**
   * Temporary backend lives in the customer app (/api/v1 → Supabase).
   * Proxy it through this origin so the admin session cookie is first-party
   * (Safari/Chrome block cross-site cookies). Set NEXT_PUBLIC_API_URL=/api/v1
   * and TEMP_API_ORIGIN=https://<customer-site>.
   */
  async rewrites() {
    const origin = (process.env.TEMP_API_ORIGIN ?? "").replace(/\/$/, "");
    return origin ? [{ source: "/api/v1/:path*", destination: `${origin}/api/v1/:path*` }] : [];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
