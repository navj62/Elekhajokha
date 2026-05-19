import type { NextConfig } from "next";

module.exports = {
  turbopack: {
    root: __dirname,
  },
};

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
