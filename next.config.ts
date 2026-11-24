import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Published at amdai.net/app. Use <Link href="/start">, never "/app/start".
  basePath: "/app",
  cacheComponents: false,
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
