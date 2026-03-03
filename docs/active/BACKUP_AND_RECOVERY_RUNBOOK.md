# 백업/복구 런북

## 1) 배포 전 체크
- Supabase SQL 실행 순서:
  1. `db/active/ADD_OPENAI_KEY_TO_PROFILES.sql`
  2. `db/active/CREATE_EVENT_SYNC_STATE.sql`
  3. `db/active/CREATE_DIARY_TABLE.sql`
  4. `db/active/CREATE_ASSISTANT_TASKS.sql`
- Vercel 환경변수:
  - `AI_KEY_ENCRYPTION_SECRET`
  - `OPENAI_MODEL`
  - `ANTHROPIC_MODEL`
  - `GOOGLE_MODEL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CRON_SECRET`

## 2) 정기 백업
- Supabase DB 백업 주기: 1일 1회
- 보관 정책: 14일
- 필수 테이블:
  - `profiles`
  - `subscriptions`
  - `events`
  - `event_sync_state`
  - `ai_key_rotation_logs`
  - `ai_request_logs`
  - `diary_entries`
  - `assistant_tasks`, `assistant_daily_notes`

## 3) 장애 대응
- 이벤트 동기화 실패:
  - 관리자 > 이벤트 동기화 상태에서 오류 소스 확인
  - `/api/events/sync` 수동 재실행
  - `event_sync_state.last_error` 메시지 기준으로 API 키/쿼터 점검
- AI 요청 실패:
  - 관리자 > AI 사용량/오류 대시보드에서 제공자별 4xx/5xx 확인
  - 사용자 키 재저장 안내
  - 모델 환경변수 점검 (`GOOGLE_MODEL` 등)

## 4) 롤백 절차
- 앱 롤백:
  - Git 이전 안정 커밋으로 `revert` 후 재배포
- DB 롤백:
  - `ai_api_key_encrypted`, `ai_key_masked`는 유지
  - 필요 시 `ai_api_key`로 임시 복구 가능 (권장하지 않음)
- 검증:
  - 로그인/권한, AI 상담, 이벤트 동기화, 관리자 대시보드 순으로 스모크 테스트

