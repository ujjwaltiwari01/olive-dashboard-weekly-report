import type { NextConfig } from "next";

/** Where Next.js proxies `/api/*` (FastAPI). Override in Docker / CI. */
const BACKEND_ORIGIN =
  process.env.BACKEND_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
