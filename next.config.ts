import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    root: __dirname,
  },
  // @ts-ignore
  allowedDevOrigins: ['local-origin.dev', '*.local-origin.dev', '192.168.1.105'],
};

export default nextConfig;
