import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Obie paczki szukają binarek względem własnego katalogu, więc nie mogą być bundlowane.
  serverExternalPackages: ["youtube-dl-exec", "ffmpeg-static"],
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
