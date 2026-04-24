/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_USE_BACKEND_PROXY: process.env.USE_BACKEND_PROXY,
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL;
    const useBackendProxy = process.env.USE_BACKEND_PROXY === "true";

    if (!useBackendProxy || !backendUrl) {
      return [];
    }

    // Note: in Next.js 14 App Router, file-based route handlers at
    // app/api/**/route.ts take precedence over afterFiles rewrites (verified
    // empirically). Proxying for /api/intelligence/*, /api/airports/*, and
    // /api/routes/* is performed by the handlers themselves when BACKEND_URL
    // is set (see app/api/intelligence/**/route.ts, app/api/airports/**/route.ts,
    // app/api/routes/explore/route.ts). The rewrites below cover endpoints
    // that do not have a file-based handler.
    return [
      {
        source: "/api/intelligence/:path*",
        destination: `${backendUrl}/intelligence/:path*`,
      },
      {
        source: "/api/meta/insight-quality",
        destination: `${backendUrl}/meta/insight-quality`,
      },
    ];
  },
};

module.exports = nextConfig;
