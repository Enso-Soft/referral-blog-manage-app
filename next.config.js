/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'referral-blog-images.s3.ap-northeast-2.amazonaws.com',
      },
    ],
  },
  // 서버 사이드 환경 변수를 빌드 시 번들링
  env: {
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    S3_REGION: process.env.S3_REGION,
    S3_BUCKET: process.env.S3_BUCKET,
  },
}

module.exports = nextConfig
