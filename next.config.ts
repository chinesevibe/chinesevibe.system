import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ponytail: pin tracing to this app repo so Next.js ignores lockfiles above it
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
