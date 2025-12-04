# 🚀 회원가입 문제 해결 - 빠른 시작 가이드

## ⚡ 지금 바로 해야 할 것 (3분이면 끝!)

### 1️⃣ Supabase에서 SQL 실행 (필수!)

**이것만 하면 끝입니다!**

#### 방법:

1. **브라우저 열기** → https://app.supabase.com 접속
2. **프로젝트 선택** (blog-web2 프로젝트)
3. **좌측 메뉴** → "SQL Editor" 클릭
4. **"New query"** 버튼 클릭
5. **아래 SQL 전체 복사** → 붙여넣기 → **"Run"** 버튼 클릭

```sql
-- ============================================
-- 프로필 테이블 생성 및 자동 생성 트리거 설정
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

6. **"Success" 메시지 확인** → ✅ 완료!

---

### 2️⃣ 테스트하기

#### 방법 A: 배포된 사이트에서 테스트 (추천)
1. https://blog-web-five-eta.vercel.app/signup 접속
2. 이메일, 비밀번호 입력
3. 회원가입 버튼 클릭
4. ✅ 성공!

#### 방법 B: 로컬에서 테스트
1. 터미널에서:
   ```bash
   cd D:\PROJECT_DATA\blog-web2
   npm run dev
   ```
2. 브라우저에서 http://localhost:3000/signup 접속
3. 회원가입 시도

---

## ✅ 완료 체크리스트

- [ ] Supabase SQL Editor에서 위 SQL 실행 완료
- [ ] "Success" 메시지 확인
- [ ] 회원가입 페이지에서 테스트 완료

---

## ❓ 문제가 있나요?

**"User already registered"**
→ 이미 가입된 이메일입니다. 다른 이메일로 시도하세요.

**"Profile creation warning"**
→ 경고일 뿐입니다. 회원가입은 성공했습니다.

**이메일이 오지 않음**
→ Supabase 대시보드 → Settings → Auth → "Enable email confirmations" 체크 해제

---

**1단계만 하면 99% 해결됩니다! 지금 바로 해보세요! 🎉**


