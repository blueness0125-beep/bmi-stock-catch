import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5001"
    return [
      {
        source: "/api/kr/:path*",
        destination: `${backendUrl}/api/kr/:path*`,
      },
    ]
  },
}

export default nextConfig
