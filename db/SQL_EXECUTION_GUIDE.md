# SQL 실행 가이드 - 빌구독 전환

## 📋 기존 SQL 파일과의 관계

### ✅ 이미 실행한 SQL 파일들

#### 1. `CREATE_PROFILES_AND_TRIGGER.sql`
- **상태:** ✅ 그대로 유지
- **이유:** profiles 테이블과 트리거는 계속 필요합니다
- **추가 작업:** `ADD_NICKNAME_TO_PROFILES.sql` 실행 필요 (닉네임 컬럼 추가)

#### 2. `UPDATE_TO_ALPHABLOG_STRUCTURE.sql`
- **상태:** ⚠️ 덮어쓰기됨 (문제없음)
- **이유:** `UPDATE_TO_BILLGUDOK_PLAN_FIXED.sql`이 `DELETE FROM plans`로 기존 데이터를 삭제하고 새로 추가하므로 자동으로 덮어쓰기됩니다
- **결과:** 기존 8개 플랜 → 새로운 2개 플랜으로 변경됨

#### 3. `UPDATE_TO_BILLGUDOK_PLAN.sql` (첫 번째 버전)
- **상태:** ⚠️ 무시해도 됨
- **이유:** `UPDATE_TO_BILLGUDOK_PLAN_FIXED.sql`이 최신 버전입니다
- **결과:** 실행하지 않아도 됩니다

---

## 🚀 지금 실행해야 할 SQL 파일 (순서대로)

### 1단계: 닉네임 컬럼 추가
**파일:** `db/ADD_NICKNAME_TO_PROFILES.sql`

```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS nickname TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON profiles(nickname);
```

**효과:**
- profiles 테이블에 nickname 컬럼 추가
- 기존 데이터는 영향 없음 (NULL 허용)
- 새로 가입하는 사용자부터 닉네임 저장 가능

---

### 2단계: 구독 플랜 업데이트
**파일:** `db/UPDATE_TO_BILLGUDOK_PLAN_FIXED.sql`

```sql
DELETE FROM plans;  -- 기존 플랜 삭제

-- 새로운 플랜 추가
INSERT INTO plans (tier, interval, name, price, features, is_active) VALUES
  ('standard', 'month', '빌구독 월간', 14900, ...),
  ('standard', 'year', '빌구독 연간', 150000, ...);
```

**효과:**
- 기존 8개 플랜 삭제
- 새로운 2개 플랜 추가 (월간/연간)
- 기존 구독 중인 사용자: 구독은 유지되지만 새로운 플랜만 표시됨

---

## ⚠️ 주의사항

### 기존 구독 중인 사용자
- 기존 구독은 `subscriptions` 테이블에 저장되어 있으므로 계속 유지됩니다
- 다만 `plans` 테이블의 플랜이 삭제되면 구독 정보 조회 시 문제가 될 수 있습니다

### 해결 방법 (선택사항)
기존 구독을 유지하려면:
1. 기존 플랜을 `is_active = false`로 변경 (삭제 대신)
2. 또는 기존 구독 사용자에게 마이그레이션 안내

---

## 📝 실행 순서

1. **`ADD_NICKNAME_TO_PROFILES.sql`** 실행
   - 닉네임 컬럼 추가
   - 기존 데이터 영향 없음

2. **`UPDATE_TO_BILLGUDOK_PLAN_FIXED.sql`** 실행
   - 기존 플랜 삭제 및 새 플랜 추가
   - 기존 구독은 유지되지만 플랜 정보는 새 것으로 표시됨

---

## ✅ 확인 방법

### 1. 닉네임 컬럼 확인
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'nickname';
```

### 2. 플랜 확인
```sql
SELECT tier, interval, name, price, is_active 
FROM plans 
ORDER BY interval;
```

**예상 결과:**
- `standard`, `month`, `빌구독 월간`, `14900`, `true`
- `standard`, `year`, `빌구독 연간`, `150000`, `true`

---

## 💡 요약

**기존 SQL 파일들:**
- ✅ `CREATE_PROFILES_AND_TRIGGER.sql` - 그대로 유지 (필요함)
- ⚠️ `UPDATE_TO_ALPHABLOG_STRUCTURE.sql` - 덮어쓰기됨 (문제없음)
- ⚠️ `UPDATE_TO_BILLGUDOK_PLAN.sql` - 무시해도 됨 (구버전)

**새로 실행할 SQL:**
1. `ADD_NICKNAME_TO_PROFILES.sql` - 닉네임 컬럼 추가
2. `UPDATE_TO_BILLGUDOK_PLAN_FIXED.sql` - 플랜 업데이트

**결론:** 기존 SQL들은 그대로 두고, 새로운 SQL 2개만 실행하면 됩니다!





