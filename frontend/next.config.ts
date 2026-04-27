import type { NextConfig } from "next";

/** `/api/*` is proxied at request time by `app/api/[...path]/route.ts` using `BACKEND_URL`,
 * so production (Vercel) does not depend on this file being evaluated with the correct env
 * at build time (rewrites used to default to http://127.0.0.1:8000 and break deploys). */

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
