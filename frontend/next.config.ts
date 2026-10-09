import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['obj-medical-alerts-listen.trycloudflare.com', 'acdbentity-bool-enters-without.trycloudflare.com', 'removing-approaches-throws-custom.trycloudflare.com'],
};

export default nextConfig;
