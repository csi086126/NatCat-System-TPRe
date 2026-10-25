import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allows the merged platform to run the UI as a small production container.
  // Oasis API and the FastAPI auth/database service remain separate services.
  output: "standalone",
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
