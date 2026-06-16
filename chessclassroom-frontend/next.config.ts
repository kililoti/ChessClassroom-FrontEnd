import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: false,
  },
  allowedDevOrigins: ['192.168.1.98'],
};

export default nextConfig;
