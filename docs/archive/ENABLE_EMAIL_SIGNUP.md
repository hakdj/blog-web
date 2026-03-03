# 이메일 회원가입 활성화 가이드

## 🚨 문제 상황
에러 메시지: **"Email signups are disabled"**
- Supabase에서 이메일 회원가입이 비활성화되어 있습니다

## ✅ 해결 방법

### Supabase에서 이메일 회원가입 활성화

1. **Supabase 대시보드 접속**
   - https://app.supabase.com 접속
   - 프로젝트 선택

2. **Settings → Auth 이동**
   - 좌측 메뉴에서 **"Settings"** 클릭
   - **"Auth"** 섹션 클릭

3. **이메일 회원가입 활성화**
   - **"Email Auth"** 섹션 찾기
   - **"Enable email signup"** 체크 박스 **체크** (체크!)
   - **"Save"** 버튼 클릭

4. **이메일 확인 설정 (선택사항)**
   - **"Enable email confirmations"** 체크 박스
   - ✅ **체크 해제** = 이메일 확인 없이 바로 로그인 (개발 환경 추천)
   - ✅ **체크** = 이메일 확인 필요 (프로덕션 환경)

5. **완료!**
   - 이제 회원가입이 정상 작동합니다

---

## 📝 체크리스트

- [ ] Supabase Settings → Auth → "Enable email signup" 체크
- [ ] (선택) "Enable email confirmations" 체크 해제 (이메일 확인 없이 사용)
- [ ] 회원가입 테스트 완료

---

## 💡 중요 사항

**두 가지 설정이 다릅니다:**

1. **"Enable email signup"** 
   - 이메일로 회원가입을 할 수 있게 하는 설정
   - ✅ **반드시 체크해야 함!**

2. **"Enable email confirmations"**
   - 회원가입 후 이메일 확인이 필요한지 설정
   - 개발 환경에서는 체크 해제 추천

---

**지금 바로 Supabase에서 "Enable email signup"을 체크하세요!**


