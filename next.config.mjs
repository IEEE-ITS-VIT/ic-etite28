
/** @type {import('next').NextConfig} */
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
