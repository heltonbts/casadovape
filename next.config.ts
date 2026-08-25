import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // As fotos enviadas pelo admin ficam no Vercel Blob, mas o lojista também
    // pode colar uma URL de fora (CDN do fornecedor…) — qualquer host https vale.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
