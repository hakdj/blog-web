# SQL 실행 가이드 (Latte Room)

## 핵심 원칙

- 운영 DB에 이미 적용된 SQL은 **재실행하지 않아도 됩니다**.
- `CREATE ... IF NOT EXISTS`, `ALTER ... IF NOT EXISTS` 형태는 재실행해도 비교적 안전합니다.
- `DELETE FROM plans` 같은 파괴성 스크립트는 운영 중 재실행 금지입니다.

## A. 신규 환경(처음 세팅) 실행 순서

1. `CREATE_PROFILES_AND_TRIGGER.sql`
2. `CREATE_SUBSCRIPTIONS_TABLE.sql`
3. `CREATE_DIARY_TABLE.sql`
4. `CREATE_ASSISTANT_TASKS.sql`
5. `CREATE_USER_ADS.sql`
6. `CREATE_EVENTS_TABLE.sql`
7. `CREATE_EVENT_SYNC_STATE.sql`
8. `CREATE_GAME_HIGH_SCORES.sql`
9. `ADD_OPENAI_KEY_TO_PROFILES.sql`
10. `ADD_AD_REJECT_REASON.sql`
11. `ADD_NICKNAME_TO_PROFILES.sql`
12. `UPDATE_TO_BILLGUDOK_PLAN_FIXED.sql` (운영 정책 확인 후 1회만)

## B. 이미 운영 중인 현재 환경

- 아래 항목은 대부분 이미 반영되어 있으므로 **재실행 불필요**:
  - 구독/이벤트/광고/일기/AI 키 관련 구조
- 예외적으로 필요할 수 있는 경우:
  - 신규 기능 컬럼 누락 시 `ADD_*` 계열만 개별 실행
  - 테이블 누락 시 `CREATE_*` 계열만 선택 실행

## C. 운영 중 재실행 금지/주의 스크립트

- `UPDATE_TO_BILLGUDOK_PLAN.sql` (구버전)
- `UPDATE_TO_ALPHABLOG_STRUCTURE.sql` (구버전 구조 스크립트)
- `UPDATE_TO_BILLGUDOK_PLAN_FIXED.sql` (플랜 데이터 교체성, 1회 정책 확인 후 사용)

## D. 점검용(읽기/검증) 스크립트

- `CHECK_PLANS.sql`
- `CHECK_AND_FIX_PLANS.sql`
- `VERIFY_PLANS_AND_RLS.sql`
- `QUICK_CHECK.sql`
- `CHECK_RESULT.sql`

위 파일들은 운영 반영 전 사전 점검/진단 용도이며, 실제 구조 변경은 A/B 기준으로 진행하세요.





