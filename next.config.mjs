/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
      "style-src 'self' 'unsafe-inline' https:",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https:",
      "connect-src 'self' https: wss:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  reactStrictMode: true,
  // Certificate template uploads go through server actions.
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [60, 75, 85, 90, 100],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    const boltUrl = process.env.NEXT_PUBLIC_BOLT_URL || 'https://bolt-3-0.vercel.app';
    const technextUrl = process.env.NEXT_PUBLIC_TECHNEXT_URL || 'https://technext-3-0.vercel.app';
    return [
      {
        source: '/hackathon',
        destination: boltUrl,
        permanent: false,
      },
      {
        source: '/hackathon/:path*',
        destination: `${boltUrl}/:path*`,
        permanent: false,
      },
      {
        source: '/technext',
        destination: technextUrl,
        permanent: false,
      },
      {
        source: '/technext/:path*',
        destination: `${technextUrl}/:path*`,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
