import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** App root (folder that contains package.json / node_modules). Fixes Tailwind resolve when the IDE workspace is a parent folder (e.g. …/Rajco with app in …/Rajco/home2). */
const appRoot = path.dirname(fileURLToPath(import.meta.url));

const tailwindPkg = path.join(appRoot, "node_modules", "tailwindcss");

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/dashboard/assistant", destination: "/dashboard", permanent: false },
      { source: "/dashboard/assistant/:path*", destination: "/dashboard", permanent: false },
      { source: "/dashboard/documents", destination: "/dashboard/quotes", permanent: false },
      { source: "/dashboard/documents/:path*", destination: "/dashboard/quotes/:path*", permanent: false },
    ];
  },
  async headers() {
    /** HSTS alleen op Vercel Production: voorkomt dat browsers op http:// blijven (localhost/previews niet forceren). */
    const base: { key: string; value: string }[] = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    if (process.env.VERCEL_ENV === "production") {
      base.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }
    return [
      {
        source: "/:path*",
        headers: base,
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
