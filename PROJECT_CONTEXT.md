# 프로젝트 컨텍스트 및 프롬프트

## 프로젝트 개요

**프로젝트명:** blog-web2  
**프로젝트 타입:** Next.js 기반 블로그 웹 애플리케이션  
**목적:** 블로그 플랫폼 구축 및 개발

## 기술 스택

- **Framework:** Next.js 16.0.1 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS v4
- **React:** 19.2.0
- **배포 플랫폼:** Vercel
- **데이터베이스/백엔드:** Supabase (환경 변수는 설정되어 있으나 아직 통합되지 않음)

## 현재 프로젝트 구조

```
blog-web2/
├── app/
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx          # 루트 레이아웃 (Geist 폰트 설정)
│   └── page.tsx            # 홈페이지 (기본 Next.js 템플릿)
├── public/
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── eslint.config.mjs
├── next.config.ts           # Next.js 설정 (기본값)
├── package.json
├── postcss.config.mjs
├── tsconfig.json            # TypeScript 설정 (@/* 경로 별칭 포함)
└── README.md
```

## 현재 상태

### 완료된 작업
1. ✅ Next.js 프로젝트 초기 설정 완료
2. ✅ Vercel에 배포 완료 (빌드 성공, 29초 소요)
3. ✅ TypeScript 및 Tailwind CSS 설정 완료
4. ✅ 기본 빌드 및 배포 파이프라인 구축

### 환경 변수 상황
- **Vercel 환경 변수 설정됨:**
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (주황색 경고 아이콘 표시됨)
  - `NEXT_PUBLIC_SUPABASE_URL` (주황색 경고 아이콘 표시됨, 값: https://kekdaafkzaigjvwyjpwr.supabase.co)
  - `APP_URL`
  - `PORTONE_WEBHOOK_SECRET`
  - `PORTONE_API_SECRET`
  - `PORTONE_API_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  
- **로컬 환경 변수:**
  - `.env.local` 파일 없음 (생성 필요)
  
- **주황색 경고 아이콘 의미 (추정):**
  - `NEXT_PUBLIC_` 접두사 변수는 브라우저에 노출되므로 보안 경고일 가능성
  - 또는 환경 변수 값 형식/유효성 검사 경고

### 아직 구현되지 않은 기능
1. ❌ Supabase 클라이언트 통합
2. ❌ Supabase 라이브러리 설치 (`@supabase/supabase-js`)
3. ❌ 로컬 개발용 `.env.local` 파일
4. ❌ 블로그 기능 구현 (글 작성, 읽기, 수정, 삭제 등)
5. ❌ 인증 기능 (Supabase Auth)
6. ❌ 결제 통합 (Portone 관련 환경 변수는 설정되어 있으나 구현되지 않음)

## 진행해야 할 작업

### 우선순위 높음
1. **환경 변수 설정**
   - `.env.local` 파일 생성
   - Vercel 환경 변수와 동일한 값으로 로컬 개발 환경 설정
   - 환경 변수 타입 정의 파일 생성 (`env.d.ts`)

2. **Supabase 통합**
   - `@supabase/supabase-js` 패키지 설치
   - Supabase 클라이언트 초기화 코드 작성
   - Supabase 타입 생성 및 설정

3. **블로그 기본 구조 설계**
   - 데이터베이스 스키마 설계
   - API 라우트 또는 Server Actions 설계
   - 페이지 구조 설계

### 우선순위 중간
4. **인증 시스템 구현**
   - Supabase Auth 연동
   - 로그인/회원가입 페이지
   - 인증 상태 관리

5. **블로그 핵심 기능 구현**
   - 글 목록 페이지
   - 글 상세 페이지
   - 글 작성/수정/삭제 기능

6. **결제 시스템 통합** (Portone)
   - Portone SDK 설치 및 설정
   - 결제 플로우 구현

## 프로젝트 설정 상세

### package.json 현재 의존성
```json
{
  "dependencies": {
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "next": "16.0.1"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@tailwindcss/postcss": "^4",
    "tailwindcss": "^4",
    "eslint": "^9",
    "eslint-config-next": "16.0.1"
  }
}
```

### TypeScript 설정
- 경로 별칭: `@/*` → 프로젝트 루트
- 타겟: ES2017
- Strict 모드 활성화

### Next.js 설정
- App Router 사용
- 기본 설정만 존재 (추가 설정 필요 시 확장 가능)

## 다음 작업 지시를 위한 프롬프트

---

**Cursor AI에게 전달할 프롬프트:**

```
나는 Next.js 16 기반 블로그 프로젝트(blog-web2)를 개발하고 있습니다. 
현재 Vercel에 배포되어 있고 빌드는 성공적으로 완료되었습니다.

**현재 상황:**
- Next.js 16.0.1, TypeScript, Tailwind CSS v4 설정 완료
- Vercel 환경 변수에 Supabase 관련 변수들이 설정되어 있음:
  - NEXT_PUBLIC_SUPABASE_URL: https://kekdaafkzaigjvwyjpwr.supabase.co
  - NEXT_PUBLIC_SUPABASE_ANON_KEY (값 설정됨)
  - SUPABASE_SERVICE_ROLE_KEY
  - Portone 관련 변수들 (API_KEY, API_SECRET, WEBHOOK_SECRET)
- .env.local 파일 없음
- Supabase 통합 코드 없음

**해야 할 작업:**
1. .env.local 파일 생성 및 환경 변수 템플릿 작성 (Vercel 변수와 매칭)
2. @supabase/supabase-js 패키지 설치
3. Supabase 클라이언트 초기화 유틸리티 파일 생성
4. 환경 변수 타입 정의 (env.d.ts)

프로젝트 구조를 확인하고 필요한 작업을 진행해주세요.
```

---

## 참고사항

- 프로젝트는 Windows 환경 (D:\PROJECT_DATA\blog-web2)에서 개발 중
- Vercel 배포는 정상 작동 중 (빌드 로그 확인 완료)
- 주황색 경고 아이콘은 환경 변수 관련 경고일 가능성이 높음 (Vercel에서 확인 필요)

