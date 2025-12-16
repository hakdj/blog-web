# 관리자 페이지 설정 가이드

## 문제 증상

관리자 페이지(`/admin`)에 접속했을 때 다음과 같은 문제가 발생할 수 있습니다:
- 페이지가 로딩되지 않음
- 데이터가 표시되지 않음
- "환경 변수 오류" 메시지가 표시됨

## 해결 방법

### 1. 환경 변수 확인

`.env.local` 파일에 다음 환경 변수가 모두 설정되어 있는지 확인하세요:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key  # ⚠️ 필수!
```

### 2. SUPABASE_SERVICE_ROLE_KEY 찾기

1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **Settings** (톱니바퀴 아이콘) 클릭
4. **API** 섹션 클릭
5. **Project API keys** 섹션에서 `service_role` 키 복사
   - ⚠️ **주의**: `service_role` 키는 절대 클라이언트에 노출하면 안 됩니다!
   - 이 키는 모든 RLS(Row Level Security) 정책을 우회할 수 있습니다.

### 3. 환경 변수 설정

`.env.local` 파일을 열고 다음과 같이 설정하세요:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. 개발 서버 재시작

환경 변수를 변경한 후에는 반드시 개발 서버를 재시작해야 합니다:

```bash
# 현재 실행 중인 서버 중지 (Ctrl+C)
# 그리고 다시 시작
npm run dev
```

### 5. 관리자 이메일 확인

관리자 페이지는 특정 이메일 주소로만 접근할 수 있습니다.

현재 설정된 관리자 이메일:
- `hakdjhakdj@naver.com`

다른 이메일을 관리자로 추가하려면:

1. `app/admin/page.tsx` 파일 열기
2. 8번 줄의 `ADMIN_EMAILS` 배열에 이메일 추가:

```typescript
const ADMIN_EMAILS = ['hakdjhakdj@naver.com', 'your-email@example.com'];
```

3. `app/api/admin/data/route.ts` 파일 열기
4. 6번 줄의 `ADMIN_EMAILS` 배열에도 동일하게 추가

## 문제 해결 체크리스트

- [ ] `.env.local` 파일이 프로젝트 루트에 존재하는가?
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 환경 변수가 설정되어 있는가?
- [ ] 환경 변수 값이 올바른가? (Supabase Dashboard에서 확인)
- [ ] 개발 서버를 재시작했는가?
- [ ] 로그인한 사용자의 이메일이 `ADMIN_EMAILS`에 포함되어 있는가?
- [ ] 브라우저 콘솔에서 오류 메시지를 확인했는가? (F12 → Console 탭)

## 디버깅

### 브라우저 콘솔 확인

1. 관리자 페이지에서 F12 키를 눌러 개발자 도구 열기
2. **Console** 탭 확인
3. 다음과 같은 로그 확인:
   - "관리자 확인: ..." - 관리자 권한 확인 결과
   - "관리자 데이터 로드 시작: ..." - 데이터 로드 시작
   - "관리자 데이터 로드 완료: ..." - 데이터 로드 성공
   - 오류 메시지가 있다면 해당 내용 확인

### 서버 로그 확인

터미널에서 개발 서버 로그를 확인하세요:
- "서비스 클라이언트 생성 시도..." - 서비스 클라이언트 생성 시작
- "서비스 클라이언트 생성 완료" - 성공
- "SUPABASE_SERVICE_ROLE_KEY 환경 변수가 설정되지 않았습니다!" - 환경 변수 누락

## 추가 도움

문제가 계속되면:
1. `.env.local` 파일의 모든 환경 변수 값을 다시 확인
2. Supabase Dashboard에서 프로젝트 상태 확인
3. 브라우저 캐시 및 쿠키 삭제 후 다시 로그인
4. 다른 브라우저에서 테스트

## Supabase 비밀번호 재설정 URL 설정

비밀번호 재설정 기능이 제대로 작동하려면 Supabase에서 리다이렉트 URL을 설정해야 합니다:

### 로컬 개발 환경

1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. 프로젝트 선택
3. **Authentication** → **URL Configuration** 클릭
4. **Redirect URLs**에 다음 URL 추가:
   ```
   http://localhost:3000/reset-password
   ```
5. **Save** 클릭

### 프로덕션 환경 (Vercel)

1. 같은 **Redirect URLs** 섹션에 프로덕션 URL 추가:
   ```
   https://your-domain.vercel.app/reset-password
   ```
2. **Save** 클릭

### 이메일 템플릿 확인

1. **Authentication** → **Email Templates** 클릭
2. **Reset Password** 템플릿 선택
3. 링크가 `{{ .ConfirmationURL }}`을 사용하는지 확인

## 보안 주의사항

⚠️ **절대 하지 말아야 할 것:**
- `SUPABASE_SERVICE_ROLE_KEY`를 Git에 커밋하지 마세요
- 클라이언트 코드에서 `SUPABASE_SERVICE_ROLE_KEY`를 사용하지 마세요
- 공개 저장소에 `.env.local` 파일을 업로드하지 마세요

✅ **해야 할 것:**
- `.env.local` 파일이 `.gitignore`에 포함되어 있는지 확인
- 환경 변수는 서버 사이드 코드에서만 사용
- 프로덕션 환경에서는 환경 변수를 안전하게 관리

