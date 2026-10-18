import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: { cpus: 2 },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  // The dense-retrieval signal loads transformers.js + ONNX runtime inside
  // Node API routes only; keep them external so they are never bundled.
  serverExternalPackages: [
    "@xenova/transformers",
    "onnxruntime-node",
    "onnxruntime-web",
    "sharp",
    "exceljs",
  ],
};

export default nextConfig;
