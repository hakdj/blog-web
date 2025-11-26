# 데이터베이스 초기화 가이드

## 🚨 "User already registered" 에러 해결

이미 가입된 사용자가 있어서 발생하는 에러입니다. 다음 방법 중 하나를 선택하세요.

---

## 방법 1: 특정 사용자만 삭제 (추천)

### Supabase 대시보드에서 삭제

1. **Supabase 대시보드 접속**
   - https://app.supabase.com 접속
   - 프로젝트 선택

2. **Authentication → Users 이동**
   - 좌측 메뉴 → "Authentication" 클릭
   - "Users" 탭 선택

3. **사용자 찾기**
   - `solutiontop7@naver.com` 검색
   - 사용자 클릭

4. **사용자 삭제**
   - 사용자 상세 페이지에서
   - "Delete user" 또는 "삭제" 버튼 클릭
   - 확인

5. **완료!**
   - 이제 다시 회원가입 가능합니다

---

## 방법 2: SQL로 사용자 삭제

### Supabase SQL Editor에서 실행

1. **Supabase 대시보드 → SQL Editor**
   - 좌측 메뉴 → "SQL Editor" 클릭
   - "New query" 버튼 클릭

2. **다음 SQL 실행** (특정 사용자 삭제)

```sql
-- 특정 이메일 사용자 삭제
DELETE FROM auth.users 
WHERE email = 'solutiontop7@naver.com';
```

3. **프로필도 삭제** (있는 경우)

```sql
-- 프로필 삭제 (사용자 삭제 시 자동 삭제되지만, 혹시 모르니)
DELETE FROM profiles 
WHERE email = 'solutiontop7@naver.com';
```

4. **"Run" 버튼 클릭**

---

## 방법 3: 모든 사용자 삭제 (전체 초기화)

⚠️ **주의: 모든 사용자 데이터가 삭제됩니다!**

### SQL로 전체 삭제

```sql
-- 모든 사용자 삭제 (주의!)
DELETE FROM auth.users;

-- 모든 프로필 삭제
DELETE FROM profiles;

-- 모든 구독 삭제
DELETE FROM subscriptions;

-- 모든 결제 내역 삭제
DELETE FROM payments;

-- 모든 블로그 글 삭제
DELETE FROM blog_posts;

-- 모든 사용량 로그 삭제
DELETE FROM usage_logs;
```

---

## 방법 4: 테이블만 유지하고 데이터만 삭제

### 안전한 초기화 (테이블 구조는 유지)

```sql
-- 사용자 관련 데이터만 삭제 (테이블은 유지)
DELETE FROM usage_logs;
DELETE FROM blog_posts;
DELETE FROM payments;
DELETE FROM subscriptions;
DELETE FROM profiles;
DELETE FROM auth.users;
```

---

## 방법 5: 완전 초기화 (테이블까지 삭제)

⚠️ **주의: 모든 테이블과 데이터가 삭제됩니다!**

```sql
-- 모든 테이블 삭제 (주의!)
DROP TABLE IF EXISTS usage_logs CASCADE;
DROP TABLE IF EXISTS blog_posts CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
-- auth.users는 Supabase 시스템 테이블이므로 직접 삭제 불가
-- 대시보드에서 삭제해야 함
```

---

## 📝 추천 방법

### 빠른 해결 (특정 사용자만 삭제)
→ **방법 1** (Supabase 대시보드에서 삭제)

### 개발/테스트 환경 전체 초기화
→ **방법 4** (데이터만 삭제, 테이블 유지)

### 완전히 처음부터 시작
→ **방법 5** (모든 테이블 삭제 후 `db/CREATE_PROFILES_AND_TRIGGER.sql` 다시 실행)

---

## ✅ 초기화 후 해야 할 일

1. **프로필 테이블 및 트리거 재설정**
   - `db/CREATE_PROFILES_AND_TRIGGER.sql` 실행

2. **플랜 데이터 확인**
   - `db/UPDATE_TO_ALPHABLOG_STRUCTURE.sql` 실행 (필요 시)

3. **회원가입 테스트**
   - 새 이메일로 회원가입 시도

---

## 🔍 확인 방법

### 사용자가 삭제되었는지 확인

1. **Supabase 대시보드 → Authentication → Users**
   - 사용자 목록 확인

2. **Supabase 대시보드 → Table Editor → profiles**
   - 프로필 데이터 확인

---

**가장 빠른 방법: 방법 1 (대시보드에서 사용자 삭제)**

