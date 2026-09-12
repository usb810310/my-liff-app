import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  allowedDevOrigins: ['exterior-frames-hearings-temp.trycloudflare.com'],
  async redirects() {
    return [
      {
        source: '/menu',
        destination: '/menu/index.html',
        permanent: false,
      },
    ];
  },
};
export default nextConfig;