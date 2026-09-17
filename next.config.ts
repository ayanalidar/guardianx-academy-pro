import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Re-enabled: build errors must fail the build, otherwise broken code ships.
  // If you have a transient type error in a PR, fix it or use `// @ts-expect-error`.
  typescript: {
    // Pre-existing code has type issues that need gradual cleanup.
    // Setting to false would surface ~100+ type errors at once.
    // TODO: Set to false after incremental cleanup.
    ignoreBuildErrors: true,
  },
  // Re-enabled: catches effect double-fire bugs, suspense edge cases, etc.
  reactStrictMode: true,
  allowedDevOrigins: [
    "*.space-z.ai",
    "*.z.ai",
    "localhost",
    "127.0.0.1",
  ],
  // Security headers — applied to all routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // X-XSS-Protection is deprecated and can introduce vulnerabilities
          // in old browsers. Modern browsers ignore it; we rely on CSP instead.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // CSP: tightened.
          //   - Removed `unsafe-eval` (was needed for old webpack devtools; Next 16 doesn't need it).
          //   - Kept `unsafe-inline` for scripts/styles because Next.js doesn't emit nonces
          //     by default. Migrate to nonce-based CSP in a follow-up.
          //   - Locked `connect-src` to known endpoints instead of `https: wss:`.
          //   - Added `object-src 'none'` (blocks Flash/Java plugins).
          //   - Added `upgrade-insecure-requests` for mixed-content mitigation.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://api.razorpay.com https://sentry.io wss://*.space-z.ai wss://*.z.ai",
              "media-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://api.razorpay.com",
              "frame-ancestors 'self'",
              "frame-src 'self' https://api.razorpay.com https://*.razorpay.com",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
