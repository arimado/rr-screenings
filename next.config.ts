import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["radix-ui"],
    staleTimes: {
      dynamic: 60,
      static: 180,
    },
  },
};

export default nextConfig;
