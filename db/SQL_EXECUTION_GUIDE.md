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

### 0-3단계: 라떼 친구 일정/메모 테이블 생성
**파일:** `db/CREATE_ASSISTANT_TASKS.sql`

**효과:**
- 라떼 친구 일정/할 일 저장용 `assistant_tasks` 테이블 생성
- 라떼 친구 하루 목표/메모 저장용 `assistant_daily_notes` 테이블 생성

---

### 0-2단계: AI 개인키 컬럼 추가
**파일:** `db/ADD_OPENAI_KEY_TO_PROFILES.sql`

**효과:**
- 개인별 AI 키 저장용 `ai_api_key`, `ai_provider` 컬럼 추가
- OpenAI/Claude/Gemini 키를 사용자 키로만 사용하도록 설정
- `ai_api_key_encrypted`, `ai_key_masked`, `ai_key_rotated_at` 보안 컬럼 추가
- `ai_key_rotation_logs`, `ai_request_logs` 운영 테이블 생성
- `ai_user_keys` 키링 테이블 생성 (여러 키 등록/선택/삭제 지원)

---

### 0-2-1단계: 이벤트 동기화 상태 확장
**파일:** `db/CREATE_EVENT_SYNC_STATE.sql`

**효과:**
- 소스별 마지막 시도/성공 시각, 상태, 오류, 수집량 저장
- 관리자 화면의 동기화 상태 뱃지/마지막 성공 시각에 사용

---

### 0-2-2단계: 게임 최고점 저장 테이블
**파일:** `db/CREATE_GAME_HIGH_SCORES.sql`

**효과:**
- 게임별 개인 최고점 저장용 `game_high_scores` 테이블 생성
- `dino`, `2048` 최고점이 계정 단위로 저장됨
- 게임 허브에서 "내 최고점" 카드로 표시 가능

---

### 0-2-3단계: 광고 반려 사유 컬럼 추가
**파일:** `db/ADD_AD_REJECT_REASON.sql`

**효과:**
- `user_ads.reject_reason`, `user_ads.rejected_at` 컬럼 추가
- 관리자 반려 사유 템플릿 저장/조회 가능

---

### 0-1단계: 추억의 일기장 테이블 생성
**파일:** `db/CREATE_DIARY_TABLE.sql`

**효과:**
- 일기장 데이터 저장용 `diary_entries` 테이블 생성
- 공개/비공개 및 이미지/태그 필드 포함

---

### 0단계: subscriptions 테이블 생성 (없을 때만)
**파일:** `db/CREATE_SUBSCRIPTIONS_TABLE.sql`

**효과:**
- 구독 상태/자동 갱신을 저장하는 `subscriptions` 테이블 생성
- 결제 및 광고 관련 API가 정상 동작하기 위한 필수 테이블

---

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

0-3. **`CREATE_ASSISTANT_TASKS.sql`** 실행
   - 라떼 친구 일정 테이블 생성

0-2. **`ADD_OPENAI_KEY_TO_PROFILES.sql`** 실행
   - profiles 테이블에 ai_api_key, ai_provider 컬럼 추가

0-2-1. **`CREATE_EVENT_SYNC_STATE.sql`** 재실행
   - event_sync_state에 상태 컬럼(last_success_at 등) 추가

0-2-2. **`CREATE_GAME_HIGH_SCORES.sql`** 실행
   - 게임 최고점 저장 테이블 생성

0-2-3. **`ADD_AD_REJECT_REASON.sql`** 실행
   - 광고 반려 사유 컬럼 추가

0-1. **`CREATE_DIARY_TABLE.sql`** 실행
   - 추억의 일기장 테이블 생성

0. **`CREATE_SUBSCRIPTIONS_TABLE.sql`** 실행 (없을 때만)
   - `subscriptions` 테이블 생성

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





