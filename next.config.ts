import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
  // Default é 1MB — pequeno demais pro upload de PDF/XML de NFe em
  // app/financeiro/[id]/actions.ts (uploadNfeAction).
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
