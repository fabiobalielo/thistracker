import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  // Enable standalone output for Cloud Run
  output: "standalone",
  // Ensure proper handling of trailing slashes
  trailingSlash: false,
};

export default nextConfig;
