import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep `next build` from overwriting manifests used by a running dev server.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  eslint: {
    // 部署时忽略 ESLint 错误
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 部署时忽略 TypeScript 错误
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
