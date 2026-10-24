import type { NextConfig } from "next";

import { resolveApiOrigin } from "./src/lib/api-origin";

const apiOrigin = resolveApiOrigin();

const nextConfig: NextConfig = {
  transpilePackages: ["@flysmart/contracts"],
  // Standalone is for PM2/self-hosting; Vercel produces its own output
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  poweredByHeader: false,
  reactCompiler: true,
  async rewrites() {
    return [
      { source: "/api/health/:path*", destination: `${apiOrigin}/health/:path*` },
      { source: "/api/:path*", destination: `${apiOrigin}/v1/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
