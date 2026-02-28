# 운영 통합 가이드 (Latte Room)

이 문서는 기존의 회원가입/배포상태/결제 URL 변경 문서를 하나로 합친 운영 기준 문서입니다.

## 1) 기본 주소와 환경

- 서비스 기본 주소: `https://latte-room.vercel.app`
- 로컬 개발 경로: `D:\PROJECT_DATA\latte-room`
- 필수 환경 변수(운영):
  - `APP_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `PORTONE_API_KEY`, `PORTONE_API_SECRET`, `PORTONE_WEBHOOK_SECRET`
  - `INISIS_API_KEY`, `INISIS_API_SECRET`, `INISIS_MID`, `INISIS_WEBHOOK_SECRET`

## 2) 회원가입/로그인 문제 점검

1. Supabase SQL Editor에서 `db/CREATE_PROFILES_AND_TRIGGER.sql` 실행
2. `profiles` 테이블 존재 확인
3. 회원가입 후 `Authentication > Users`와 `profiles` 동기 생성 확인
4. 이메일 인증 이슈는 Supabase Auth 설정에서 확인

## 3) 결제사 URL 설정

### Portone

- 서비스 URL: `https://latte-room.vercel.app`
- 웹훅 URL(사용 시): `https://latte-room.vercel.app/api/webhooks/portone`

### KG이니시스

- 웹훅 URL: `https://latte-room.vercel.app/api/webhooks/inisis`
- 콜백 URL: `https://latte-room.vercel.app/api/inisis/callback`
- 리다이렉트 예시:
  - `https://latte-room.vercel.app/api/inisis/callback?success=true`
  - `https://latte-room.vercel.app/api/inisis/callback?success=false`

## 4) 배포 점검

1. `git push origin master`
2. Vercel Deployments에서 최신 커밋 `Ready` 확인
3. 홈/로그인/요금제/API 핵심 라우트 스모크 테스트

## 5) 문제 발생 시 우선순위

1. Vercel Build Log 확인
2. Vercel Runtime Log 확인
3. Supabase Auth/Database 로그 확인
4. 결제사 대시보드(웹훅 전송 로그) 확인
