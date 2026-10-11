import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      // strict-origin keeps the token path out of every referrer. no-referrer
      // would also make the browser send "Origin: null" on the connect form,
      // which Next.js rejects as a cross-site Server Action.
      {
        source: "/agent/:path*",
        headers: [{ key: "Referrer-Policy", value: "strict-origin" }],
      },
      {
        source: "/agents/connect",
        headers: [{ key: "Referrer-Policy", value: "strict-origin" }],
      },
      {
        source: "/m/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
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
