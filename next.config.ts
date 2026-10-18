import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: { cpus: 2 },
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
