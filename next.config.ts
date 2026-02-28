import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 외부 스크립트/확장 프로그램에서 발생하는 .map 요청으로 콘솔 노이즈가 생기지 않도록
  // 프로덕션 브라우저 소스맵 생성을 명시적으로 비활성화합니다.
  productionBrowserSourceMaps: false,
};

export default nextConfig;
