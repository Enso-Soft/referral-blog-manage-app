/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: 'https://referral-blog.firebaseapp.com/__/auth/:path*',
      },
    ]
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'date-fns', 'firebase/firestore', 'firebase/auth'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'referral-blog-images.s3.ap-northeast-2.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
      {
        protocol: 'https',
        hostname: '**.tistory.com',
      },
      {
        protocol: 'https',
        hostname: '**.naver.com',
      },
      {
        protocol: 'https',
        hostname: '**.pstatic.net',
      },
    ],
  },
  // Server credentials come from the runtime environment, never webpack defines.
}

module.exports = nextConfig
