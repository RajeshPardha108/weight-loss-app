import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    "*.run.app",
    "*.googleusercontent.com",
    "*.aistudio.google.com",
    "*.trycloudflare.com",
  ],
};

export default nextConfig;
