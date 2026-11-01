import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-hosted builds (deploy/deploy-web.sh) set NEXT_OUTPUT=standalone to get a
  // minimal server.js bundle for Docker. Netlify builds leave it unset.
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" as const } : {}),
};

export default nextConfig;
