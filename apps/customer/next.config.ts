import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ["@dht/ui", "@dht/api-client", "@dht/types"],
  allowedDevOrigins: ["192.168.0.176"],
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
