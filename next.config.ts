import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],

  /* Dev-only routes. A file named `page.dev.tsx` is only a route when
     `dev.tsx` is a recognised page extension, which it is in development
     and is not in a production build — so such a file is never compiled
     into the route table, never rendered, and never reachable, rather than
     being shipped and gated at runtime. This matters because the scratch
     harness lives under /view/*, a prefix proxy.ts treats as PUBLIC: a
     runtime guard alone would put a dev surface one NODE_ENV mistake away
     from being served unauthenticated on a deployed app.
     Keep the base list in sync with the extensions the app actually uses. */
  pageExtensions:
    process.env.NODE_ENV === "development"
      ? ["tsx", "ts", "jsx", "js", "dev.tsx"]
      : ["tsx", "ts", "jsx", "js"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(self), usb=(), interest-cohort=()",
          },
          {
            key: "Content-Security-Policy-Report-Only",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://challenges.cloudflare.com https://checkout.razorpay.com https://*.razorpay.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://res.cloudinary.com https://img.clerk.com https://*.razorpay.com",
              "font-src 'self' data:",
              "connect-src 'self' https://*.clerk.accounts.dev https://api.razorpay.com https://lumberjack.razorpay.com https://*.razorpay.com",
              "frame-src 'self' https://*.clerk.accounts.dev https://api.razorpay.com https://checkout.razorpay.com",
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
