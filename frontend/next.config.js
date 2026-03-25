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
