import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** App root (folder that contains package.json / node_modules). Fixes Tailwind resolve when the IDE workspace is a parent folder (e.g. …/Rajco with app in …/Rajco/home2). */
const appRoot = path.dirname(fileURLToPath(import.meta.url));

const tailwindPkg = path.join(appRoot, "node_modules", "tailwindcss");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  turbopack: {
    root: appRoot,
    resolveAlias: {
      tailwindcss: tailwindPkg,
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string> | undefined),
      tailwindcss: tailwindPkg,
    };
    return config;
  },
};

export default nextConfig;
