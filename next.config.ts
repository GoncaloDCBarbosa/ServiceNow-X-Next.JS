import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Only the TRH brand SVGs in /public/brand go through next/image;
    // they're our own trusted local assets.
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
