/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === 'production' ? '.next' : '.next-dev',
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
