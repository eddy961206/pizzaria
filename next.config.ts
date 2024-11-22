import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true, // 필요하면 다른 설정도 추가
  images: {
    domains: ['firebasestorage.googleapis.com'], // 허용할 이미지 도메인 추가
  },
};

export default nextConfig;
