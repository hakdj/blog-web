# 회원가입 문제 해결 - 실행 가이드

## 🎯 지금 바로 해야 할 3가지

### ✅ 1단계: Supabase에서 SQL 실행 (가장 중요!)

**이것만 하면 90% 해결됩니다!**

1. **Supabase 대시보드 접속**
   - https://app.supabase.com 접속
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 좌측 메뉴에서 "SQL Editor" 클릭
   - "New query" 버튼 클릭

3. **SQL 파일 내용 복사**
   - 프로젝트 폴더에서 `db/CREATE_PROFILES_AND_TRIGGER.sql` 파일 열기
   - 전체 내용 복사 (Ctrl+A → Ctrl+C)

4. **SQL 실행**
   - Supabase SQL Editor에 붙여넣기 (Ctrl+V)
   - "Run" 버튼 클릭 (또는 Ctrl+Enter)

5. **결과 확인**
   - "Success" 메시지가 나오면 완료!
   - 에러가 나와도 "already exists" 같은 메시지면 괜찮습니다

---

### ✅ 2단계: 로컬 개발 환경 설정 (로컬에서 테스트할 경우만)

**Vercel에 배포된 사이트는 이미 설정되어 있으니 이 단계는 건너뛰어도 됩니다.**

1. **프로젝트 폴더에 `.env.local` 파일 생성**
   - 파일 위치: `D:\PROJECT_DATA\blog-web2\.env.local`

2. **다음 내용 입력** (Supabase 대시보드에서 실제 값 가져오기)
   ```
   NEXT_PUBLIC_SUPABASE_URL=여기에_실제_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에_실제_키
   SUPABASE_SERVICE_ROLE_KEY=여기에_실제_키
   ```

3. **Supabase 키 확인 방법**
   - Supabase 대시보드 → Settings → API
   - Project URL 복사 → `NEXT_PUBLIC_SUPABASE_URL`에 입력
   - anon public 키 복사 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 입력
   - service_role 키 복사 → `SUPABASE_SERVICE_ROLE_KEY`에 입력

---

### ✅ 3단계: 테스트

1. **개발 서버 실행** (로컬 테스트 시)
   ```bash
   cd D:\PROJECT_DATA\blog-web2
   npm run dev
   ```

2. **브라우저에서 테스트**
   - http://localhost:3000/signup 접속
   - 회원가입 시도

3. **결과 확인**
   - 성공: "회원가입이 완료되었습니다!" 메시지
   - 실패: 브라우저 콘솔(F12)에서 에러 확인

---

## 📝 체크리스트

- [ ] Supabase SQL Editor에서 `CREATE_PROFILES_AND_TRIGGER.sql` 실행 완료
- [ ] Supabase Table Editor에서 `profiles` 테이블 확인
- [ ] (로컬 개발 시) `.env.local` 파일 생성 및 값 입력
- [ ] 회원가입 테스트 완료

---

## ❓ 문제 해결

**"User already registered"**
→ 이미 가입된 이메일입니다. 다른 이메일로 시도하세요.

**"Supabase 환경 변수가 설정되지 않았습니다"**
→ 2단계를 다시 확인하세요.

**이메일이 오지 않음**
→ Supabase 대시보드 → Settings → Auth → "Enable email confirmations" 체크 해제 (개발 환경)

---

**가장 중요한 것은 1단계입니다! 이것만 하면 대부분 해결됩니다!**


