import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.blob.vercel-storage.com',
        pathname: '/**',
      },
    ],
  },
  turbopack: {
    root: __dirname,
  },
  // @ts-ignore
  allowedDevOrigins: [
    'local-origin.dev',
    '*.local-origin.dev',
    '192.168.1.105',
    '192.168.1.164',
    'Wipays-MacBook-Pro-3.local',
  ],
};

export default nextConfig;
