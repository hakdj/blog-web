# 회원가입 문제 해결 가이드 (단계별)

## 📋 전체 작업 순서

1. ✅ **Supabase 데이터베이스 설정** (가장 중요!)
2. ✅ **로컬 환경 변수 확인**
3. ✅ **개발 서버 재시작**
4. ✅ **회원가입 테스트**

---

## 🔥 1단계: Supabase 데이터베이스 설정 (필수!)

이 단계가 가장 중요합니다! 회원가입이 안 되는 가장 큰 이유는 `profiles` 테이블과 자동 생성 트리거가 없기 때문입니다.

### 1-1. Supabase 대시보드 접속

1. 브라우저에서 https://app.supabase.com 접속
2. 로그인 (이메일/비밀번호)
3. 프로젝트 선택 (latte-room 프로젝트)

### 1-2. SQL Editor 열기

1. 좌측 메뉴에서 **"SQL Editor"** 클릭
   - 아이콘: 📝 또는 "SQL Editor" 텍스트
2. **"New query"** 버튼 클릭 (새 쿼리 창 열기)

### 1-3. SQL 파일 내용 복사

1. 프로젝트 폴더에서 `db/CREATE_PROFILES_AND_TRIGGER.sql` 파일 열기
2. **전체 내용 복사** (Ctrl+A → Ctrl+C)

### 1-4. SQL 실행

1. Supabase SQL Editor에 붙여넣기 (Ctrl+V)
2. 우측 상단 **"Run"** 버튼 클릭 (또는 Ctrl+Enter)
3. 결과 확인:
   - ✅ 성공: "Success. No rows returned" 또는 비슷한 메시지
   - ❌ 에러: 빨간색 에러 메시지 확인

### 1-5. 에러가 나는 경우

**에러 1: "relation 'profiles' already exists"**
- ✅ 정상입니다! 테이블이 이미 있다는 뜻
- 무시하고 계속 진행하세요

**에러 2: "permission denied"**
- ⚠️ 권한 문제입니다
- Supabase 대시보드에서 프로젝트 관리자 권한이 있는지 확인

**에러 3: 기타 에러**
- 에러 메시지를 복사해서 확인 필요

### 1-6. 확인하기

1. 좌측 메뉴 → **"Table Editor"** 클릭
2. **"profiles"** 테이블이 있는지 확인
3. 있으면 ✅ 성공!

---

## 🔧 2단계: 로컬 환경 변수 확인 (로컬 개발 시)

로컬에서 개발 서버를 실행할 때만 필요합니다. Vercel에 배포된 사이트는 이미 설정되어 있습니다.

### 2-1. .env.local 파일 확인

1. 프로젝트 루트 폴더 (`D:\PROJECT_DATA\latte-room`) 확인
2. `.env.local` 파일이 있는지 확인

### 2-2. .env.local 파일이 없는 경우

1. `env.example` 파일을 복사해서 `.env.local` 파일 생성
2. 다음 내용 입력:

```env
NEXT_PUBLIC_SUPABASE_URL=https://kekdaafkzaigjvwyjpwr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에_실제_키_입력
SUPABASE_SERVICE_ROLE_KEY=여기에_실제_키_입력
```

### 2-3. Supabase 키 확인 방법

1. Supabase 대시보드 접속
2. 좌측 메뉴 → **"Settings"** → **"API"** 클릭
3. 다음 값 복사:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`에 입력
   - **anon public** 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 입력
   - **service_role** 키 → `SUPABASE_SERVICE_ROLE_KEY`에 입력

### 2-4. Vercel 배포 환경

- Vercel에 배포된 사이트는 이미 환경 변수가 설정되어 있습니다
- 이 단계는 건너뛰어도 됩니다

---

## 🚀 3단계: 개발 서버 재시작 (로컬 개발 시)

코드를 수정했으니 서버를 재시작해야 변경사항이 반영됩니다.

### 3-1. 현재 실행 중인 서버 종료

1. 터미널/명령 프롬프트에서 `Ctrl+C` 눌러서 서버 종료
2. 서버가 실행 중이 아니면 이 단계 건너뛰기

### 3-2. 개발 서버 시작

1. 프로젝트 폴더로 이동:
   ```bash
   cd D:\PROJECT_DATA\latte-room
   ```

2. 개발 서버 실행:
   ```bash
   npm run dev
   ```

3. 성공 메시지 확인:
   ```
   ▲ Next.js 16.0.1
   - Local:        http://localhost:3000
   ```

### 3-3. 브라우저에서 확인

1. 브라우저에서 http://localhost:3000 접속
2. 정상적으로 페이지가 보이면 ✅ 성공!

---

## 🧪 4단계: 회원가입 테스트

### 4-1. 회원가입 페이지 접속

1. 브라우저에서 http://localhost:3000/signup 접속
   - 또는 메인 페이지에서 "회원가입" 링크 클릭

### 4-2. 회원가입 시도

1. 이메일 주소 입력 (예: `test@example.com`)
2. 비밀번호 입력 (최소 6자 이상)
3. 비밀번호 확인 입력 (위와 동일)
4. **"회원가입"** 버튼 클릭

### 4-3. 결과 확인

**성공한 경우:**
- ✅ "회원가입이 완료되었습니다!" 메시지 표시
- ✅ 로그인 페이지로 자동 이동 또는 대시보드로 이동

**실패한 경우:**
- ❌ 빨간색 에러 메시지 표시
- 브라우저 개발자 도구 열기 (F12)
- **Console** 탭에서 에러 메시지 확인

### 4-4. 브라우저 개발자 도구로 디버깅

1. **F12** 키 누르기 (또는 우클릭 → "검사")
2. **Console** 탭 클릭
3. 회원가입 버튼 클릭
4. 콘솔에 나타나는 메시지 확인:
   - `Signup response:` - 회원가입 응답
   - `Signup error:` - 에러 (있는 경우)
   - `Profile created successfully` - 프로필 생성 성공

### 4-5. Supabase에서 확인

1. Supabase 대시보드 → **Authentication** → **Users**
2. 방금 가입한 이메일 주소로 사용자 검색
3. 사용자가 생성되었는지 확인

4. Supabase 대시보드 → **Table Editor** → **profiles**
5. 방금 가입한 사용자의 프로필이 있는지 확인

---

## ❓ 문제 해결

### 문제 1: "Supabase 환경 변수가 설정되지 않았습니다"

**해결:**
- 2단계를 다시 확인하세요
- `.env.local` 파일이 올바른 위치에 있는지 확인
- 환경 변수 값이 올바른지 확인

### 문제 2: "User already registered"

**해결:**
- 해당 이메일로 이미 가입된 사용자가 있습니다
- 다른 이메일 주소로 시도하거나
- Supabase 대시보드에서 기존 사용자 삭제

### 문제 3: "Profile creation warning"

**해결:**
- 프로필 생성에 경고가 있지만 회원가입은 성공한 것입니다
- Supabase에서 profiles 테이블 확인
- 트리거가 제대로 설정되었는지 확인 (1단계 다시 확인)

### 문제 4: 이메일이 오지 않음

**해결:**
1. Supabase 대시보드 → **Settings** → **Auth**
2. **Email Auth** 섹션에서:
   - **Enable email confirmations** 체크 해제 (개발 환경)
   - 또는 SMTP 설정 확인 (프로덕션 환경)

### 문제 5: 네트워크 에러

**해결:**
- 인터넷 연결 확인
- Supabase 프로젝트가 활성화되어 있는지 확인
- Supabase URL이 올바른지 확인

---

## ✅ 체크리스트

회원가입이 정상 작동하려면 다음을 모두 확인하세요:

- [ ] Supabase SQL Editor에서 `CREATE_PROFILES_AND_TRIGGER.sql` 실행 완료
- [ ] Supabase Table Editor에서 `profiles` 테이블 존재 확인
- [ ] 로컬 개발 시: `.env.local` 파일 존재 및 올바른 값 입력
- [ ] 개발 서버 재시작 완료
- [ ] 브라우저에서 `/signup` 페이지 접속 가능
- [ ] 회원가입 시도 시 에러 없음
- [ ] Supabase Authentication → Users에서 사용자 생성 확인
- [ ] Supabase Table Editor → profiles에서 프로필 생성 확인

---

## 🎯 다음 단계

회원가입이 성공하면:

1. **로그인 테스트** - `/login` 페이지에서 로그인 시도
2. **대시보드 접근** - 로그인 후 `/dashboard` 접근 확인
3. **프로필 확인** - 대시보드에서 사용자 정보 확인

---

## 📞 추가 도움

문제가 계속되면:

1. 브라우저 콘솔의 전체 에러 메시지 복사
2. Supabase 대시보드 → **Logs** → **Auth Logs** 확인
3. 에러 메시지와 함께 문의

---

**마지막 업데이트:** 2024년 11월


