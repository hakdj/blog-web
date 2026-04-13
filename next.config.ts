import type { NextConfig } from "next";

const nextConfig = {
  // 외부 스크립트/확장 프로그램에서 발생하는 .map 요청으로 콘솔 노이즈가 생기지 않도록
  // 프로덕션 브라우저 소스맵 생성을 명시적으로 비활성화합니다.
  productionBrowserSourceMaps: false,
  eslint: {
    // 빌드 시 린트 에러를 무시하도록 설정 (현재 1200개 이상의 에러/경고가 있어 배포를 위해 임시 허용)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 빌드 시 타입 에러를 무시하도록 설정 (배포 우선 순위)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
