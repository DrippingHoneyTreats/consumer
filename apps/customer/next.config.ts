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

/** Current machine LAN IPs so phone testing via http://192.168… works with HMR. */
function lanHosts(): string[] {
  const hosts = new Set<string>(["192.168.0.176"]);
  try {
    for (const nets of Object.values(os.networkInterfaces())) {
      for (const net of nets ?? []) {
        if (net.family === "IPv4" && !net.internal) hosts.add(net.address);
      }
    }
  } catch {
    // CI / restricted sandboxes may block os.networkInterfaces()
  }
  return [...hosts];
}

const onNetlify = Boolean(process.env.NETLIFY);

const nextConfig: NextConfig = {
  // Standalone is for Docker/self-host; Netlify OpenNext handles the deploy runtime.
  ...(onNetlify ? {} : { output: "standalone" as const }),
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ["@dht/ui", "@dht/api-client", "@dht/types"],
  allowedDevOrigins: lanHosts(),
  async redirects() {
    return [
      { source: "/snacks", destination: "/pastries", permanent: true },
      { source: "/snacks/:path*", destination: "/pastries/:path*", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
