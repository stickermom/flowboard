/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['i.pinimg.com', 'picsum.photos'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  eslint: {
    // Disable ESLint during builds to avoid config conflicts
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow build to continue even with type errors (for now)
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;

