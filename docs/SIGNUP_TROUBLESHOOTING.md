# 회원가입 문제 해결 가이드

## 문제 상황
1. 회원가입이 안됨
2. 회원가입 후 이메일이 오지 않음

## 해결 방법

### 1. 브라우저 콘솔에서 에러 확인

회원가입을 시도한 후 브라우저 개발자 도구(F12)를 열고 Console 탭에서 다음을 확인하세요:

- `Signup response:` - 회원가입 응답 데이터
- `Signup error:` - 회원가입 에러 (있는 경우)
- `Failed to initialize Supabase client:` - Supabase 클라이언트 초기화 에러 (있는 경우)

**확인 사항:**
- 에러 메시지가 표시되는지
- 어떤 종류의 에러인지 (네트워크 에러, 인증 에러 등)

### 2. Supabase 환경 변수 확인

**로컬 개발 환경:**
1. 프로젝트 루트에 `.env.local` 파일이 있는지 확인
2. 다음 변수들이 설정되어 있는지 확인:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

**배포 환경 (Vercel):**
1. Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
2. 위의 두 변수가 설정되어 있는지 확인
3. 변수가 있다면 값이 올바른지 확인

### 3. Supabase 대시보드에서 이메일 설정 확인

#### 3-1. 이메일 템플릿 확인
1. Supabase 대시보드 접속: https://app.supabase.com
2. 프로젝트 선택
3. 좌측 메뉴 → **Settings** → **Auth**
4. **Email Templates** 섹션 확인
5. **Confirm signup** 템플릿이 활성화되어 있는지 확인

#### 3-2. SMTP 설정 확인 (이메일이 오지 않는 경우)
1. Supabase 대시보드 → **Settings** → **Auth**
2. **SMTP Settings** 섹션 확인
3. SMTP가 설정되어 있지 않으면:
   - 기본 Supabase SMTP 사용 (제한적, 개발용)
   - 또는 커스텀 SMTP 설정 (프로덕션 권장)

**참고:** Supabase의 기본 SMTP는 개발 환경에서만 사용 가능하며, 일일 발송 제한이 있습니다.

#### 3-3. 이메일 확인 요구사항 설정
1. Supabase 대시보드 → **Settings** → **Auth**
2. **Email Auth** 섹션에서:
   - **Enable email confirmations**: 체크 여부 확인
   - 개발 환경에서는 체크 해제하여 즉시 로그인 가능하게 할 수 있음

### 4. 사용자 확인 상태 확인

회원가입 후에도 이메일이 오지 않는 경우:

1. Supabase 대시보드 → **Authentication** → **Users**
2. 방금 가입한 이메일 주소로 사용자 검색
3. 사용자가 생성되었는지 확인
4. 사용자 클릭 → **"Confirm email"** 버튼으로 수동 확인 가능

### 5. 일반적인 에러 및 해결 방법

#### "User already registered"
- 해당 이메일로 이미 가입된 사용자가 있음
- 로그인 페이지에서 비밀번호 재설정 또는 로그인 시도

#### "Invalid email"
- 이메일 형식이 올바르지 않음
- 올바른 이메일 형식으로 입력

#### "Password should be at least 6 characters"
- 비밀번호가 너무 짧음
- 최소 6자 이상 입력

#### "Supabase 환경 변수가 설정되지 않았습니다"
- 환경 변수가 설정되지 않음
- `.env.local` 파일 확인 또는 Vercel 환경 변수 확인

#### "Network error" 또는 "Failed to fetch"
- 네트워크 연결 문제
- Supabase URL이 올바른지 확인
- 인터넷 연결 확인

### 6. 개발 환경에서 이메일 확인 비활성화 (테스트용)

개발 중에는 이메일 확인을 비활성화하여 즉시 로그인 가능하게 할 수 있습니다:

1. Supabase 대시보드 → **Settings** → **Auth**
2. **Email Auth** 섹션
3. **Enable email confirmations** 체크 해제
4. 저장

**주의:** 프로덕션 환경에서는 보안을 위해 이메일 확인을 활성화해야 합니다.

### 7. 디버깅 체크리스트

회원가입 문제를 해결하기 위해 다음을 확인하세요:

- [ ] 브라우저 콘솔에 에러가 있는지 확인
- [ ] 환경 변수가 올바르게 설정되어 있는지 확인
- [ ] Supabase 프로젝트가 활성화되어 있는지 확인
- [ ] 네트워크 연결이 정상인지 확인
- [ ] 이메일 주소가 올바른 형식인지 확인
- [ ] 비밀번호가 6자 이상인지 확인
- [ ] Supabase 대시보드에서 사용자가 생성되었는지 확인
- [ ] 이메일 템플릿이 활성화되어 있는지 확인
- [ ] SMTP 설정이 올바른지 확인 (이메일이 오지 않는 경우)

### 8. 추가 도움말

문제가 계속되면:
1. 브라우저 콘솔의 전체 에러 메시지 복사
2. Supabase 대시보드 → **Logs** → **Auth Logs**에서 관련 로그 확인
3. Supabase 공식 문서 참조: https://supabase.com/docs/guides/auth

