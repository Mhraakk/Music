import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content Security Policy.
 * Dev needs 'unsafe-eval' and websocket connections for React Refresh / HMR.
 * Inline scripts/styles are allowed because the Next.js App Router injects
 * inline bootstrap/hydration code; tightening to nonces is a future step.
 */
const csp = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `object-src 'none'`,
  `frame-ancestors 'none'`,
  // Artwork comes from each provider's own CDN.
  [
    "img-src 'self' data: blob:",
    "https://*.mzstatic.com", // Apple / iTunes
    "https://*.dzcdn.net", // Deezer
    "https://i.scdn.co", // Spotify
    "https://*.ytimg.com", // YouTube Music
    "https://api.iconify.design",
  ].join(" "),
  // 30-second previews are streamed straight from the providers.
  [
    "media-src 'self' blob:",
    "https://audio-ssl.itunes.apple.com",
    "https://*.mzstatic.com",
    "https://*.dzcdn.net",
    "https://p.scdn.co",
  ].join(" "),
  `font-src 'self' data:`,
  `style-src 'self' 'unsafe-inline'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://va.vercel-scripts.com`,
  `connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com${
    isDev ? " ws: wss:" : ""
  }`,
  `form-action 'self'`,
  `upgrade-insecure-requests`,
]
  .join("; ")
  .concat(";");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "is1-ssl.mzstatic.com" },
      { protocol: "https", hostname: "is2-ssl.mzstatic.com" },
      { protocol: "https", hostname: "is3-ssl.mzstatic.com" },
      { protocol: "https", hostname: "is4-ssl.mzstatic.com" },
      { protocol: "https", hostname: "is5-ssl.mzstatic.com" },
      { protocol: "https", hostname: "**.dzcdn.net" },
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "**.ytimg.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
