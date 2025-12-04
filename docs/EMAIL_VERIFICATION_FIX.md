# 이메일 인증 문제 해결 가이드

## 🚨 문제 상황
- 회원가입은 했지만 이메일이 오지 않음
- 로그인 시 "이메일 인증이 완료되지 않았을 수 있습니다" 메시지

## ✅ 해결 방법 (2가지)

### 방법 1: Supabase에서 이메일 확인 비활성화 (개발 환경 - 추천!)

**이 방법을 사용하면 이메일 확인 없이 바로 로그인할 수 있습니다.**

1. **Supabase 대시보드 접속**
   - https://app.supabase.com 접속
   - 프로젝트 선택

2. **Settings → Auth 이동**
   - 좌측 메뉴에서 **"Settings"** 클릭
   - **"Auth"** 섹션 클릭

3. **이메일 확인 비활성화**
   - **"Email Auth"** 섹션 찾기
   - **"Enable email confirmations"** 체크 박스 **해제** (체크 해제!)
   - **"Save"** 버튼 클릭

4. **완료!**
   - 이제 회원가입하면 바로 로그인 가능합니다
   - 이메일 확인 없이 사용 가능합니다

---

### 방법 2: Supabase에서 사용자 수동 확인 (이미 가입한 사용자용)

**이미 가입한 사용자가 있는 경우 이 방법을 사용하세요.**

1. **Supabase 대시보드 접속**
   - https://app.supabase.com 접속
   - 프로젝트 선택

2. **Authentication → Users 이동**
   - 좌측 메뉴에서 **"Authentication"** 클릭
   - **"Users"** 탭 선택

3. **사용자 찾기**
   - 가입한 이메일 주소로 검색
   - 사용자 클릭

4. **이메일 확인**
   - 사용자 상세 페이지에서
   - **"Confirm email"** 버튼 클릭
   - 또는 **"Email Confirmed"** 체크 박스 체크

5. **완료!**
   - 이제 해당 사용자는 로그인할 수 있습니다

---

## 🔍 추가 확인 사항

### 프로필이 생성되었는지 확인

1. **Supabase 대시보드 → Table Editor**
2. **"profiles"** 테이블 클릭
3. 가입한 사용자의 프로필이 있는지 확인
4. 없으면 `db/CREATE_PROFILES_AND_TRIGGER.sql` 실행 필요

---

## 📝 체크리스트

- [ ] Supabase Settings → Auth → "Enable email confirmations" 체크 해제
- [ ] (또는) Supabase Authentication → Users에서 사용자 수동 확인
- [ ] Supabase Table Editor → profiles에서 프로필 확인
- [ ] 로그인 테스트 완료

---

## 💡 추천 방법

**개발/테스트 환경에서는 방법 1을 추천합니다!**
- 이메일 확인 없이 바로 사용 가능
- 테스트가 훨씬 쉬워집니다
- 프로덕션 환경에서는 다시 활성화하면 됩니다

---

**가장 빠른 해결책: 방법 1 (이메일 확인 비활성화)을 사용하세요!**


