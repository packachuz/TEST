import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Codespaces forwarded port URLs for NextAuth
  async headers() {
    return [
      {
        source: "/api/auth/:path*",
        headers: [{ key: "X-Forwarded-Proto", value: "https" }],
      },
    ];
  },
};

export default nextConfig;
