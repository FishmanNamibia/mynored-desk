/** @type {import('next').NextConfig} */

const rawBackendApiUrl =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:34567'
const backendApiUrl = /^https?:\/\//i.test(rawBackendApiUrl)
  ? rawBackendApiUrl
  : `http://${rawBackendApiUrl}`

const ContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://login.microsoftonline.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || backendApiUrl} https://login.microsoftonline.com https://login.microsoft.com https://sts.windows.net https://graph.microsoft.com https://api.open-meteo.com`,
  "frame-src 'self' https://login.microsoftonline.com https://view.officeapps.live.com https://*.sharepoint.com https://*.office.com https://*.microsoft.com https://*.live.com https://*.onedrive.com https:",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://login.microsoftonline.com",
  "upgrade-insecure-requests",
].join('; ')

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy,
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), payment=()',
  },
]

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: [],
  experimental: {},
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
  // Add proxy for API requests
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendApiUrl}/api/:path*`,
      },
      {
        source: '/generated_memos/:path*',
        destination: `${backendApiUrl}/generated_memos/:path*`,
      },
    ];
  },
  // No implicit env block; use NEXT_PUBLIC_* in .env.local only
};

export default nextConfig;
