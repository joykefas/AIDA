import type { NextConfig } from "next";

const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:6001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiOrigin}/:path*` }];
  },
  images: {
    remotePatterns: [{ protocol: "http", hostname: "localhost" }],
  },
};

export default nextConfig;
