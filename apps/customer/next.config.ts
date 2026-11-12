import type { NextConfig } from "next";
import os from "os";
import path from "path";

/** Current machine LAN IPs so phone testing via http://192.168… works with HMR. */
function lanHosts(): string[] {
  const hosts = new Set<string>();
  for (const nets of Object.values(os.networkInterfaces())) {
    for (const net of nets ?? []) {
      if (net.family === "IPv4" && !net.internal) hosts.add(net.address);
    }
  }
  // Keep a couple of common DHCP leftovers so a short IP change still works mid-session.
  hosts.add("192.168.0.176");
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
