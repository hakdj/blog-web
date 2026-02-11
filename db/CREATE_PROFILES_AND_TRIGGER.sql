-- ============================================
-- 프로필 테이블 생성 및 자동 생성 트리거 설정
-- 회원가입 시 자동으로 profiles 테이블에 프로필 생성
-- ============================================

-- ============================================
-- 1단계: profiles 테이블 생성 (없는 경우)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  openai_api_key TEXT,
  ai_provider TEXT,
  ai_api_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2단계: RLS (Row Level Security) 활성화
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3단계: RLS 정책 설정
-- ============================================

-- 사용자는 자신의 프로필을 볼 수 있음
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- 사용자는 자신의 프로필을 수정할 수 있음
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- 4단계: 프로필 자동 생성 함수 생성
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5단계: 트리거 생성 (auth.users에 새 사용자 생성 시 자동 실행)
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ✅ 완료!
-- ============================================
-- 이제 회원가입 시 자동으로 profiles 테이블에 프로필이 생성됩니다.
-- 
-- 확인 방법:
-- 1. Supabase 대시보드 → Authentication → Users에서 새 사용자 생성
-- 2. Table Editor → profiles 테이블에서 새 프로필 확인
-- ============================================

