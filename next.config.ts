import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
