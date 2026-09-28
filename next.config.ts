import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Extra image host used only by the e2e mock server (e.g. "http://localhost:4010").
 * In production this variable is not set.
 */
const mockImageOrigin = process.env.E2E_MOCK_ORIGIN;

const remotePatterns: RemotePattern[] = [
  { protocol: "https", hostname: "openaccess-cdn.clevelandart.org", pathname: "/**" },
];

// AIC images are served through the same-origin proxy (/api/images/aic/…).
const imgSources = ["'self'", "data:", "blob:", "https://openaccess-cdn.clevelandart.org"];

if (mockImageOrigin) {
  const url = new URL(mockImageOrigin);
  remotePatterns.push({
    protocol: url.protocol.replace(":", "") as "http" | "https",
    hostname: url.hostname,
    port: url.port,
    pathname: "/**",
  });
  imgSources.push(url.origin);
}

const contentSecurityPolicy = [
  "default-src 'self'",
  `img-src ${imgSources.join(" ")}`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["isomorphic-dompurify", "jsdom"],
  images: {
    remotePatterns,
    unoptimized: process.env.IMAGE_UNOPTIMIZED === "true",
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600],
    imageSizes: [96, 160, 240, 320],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
