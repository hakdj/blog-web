# 결제 시스템 완벽 가이드

## 📋 목차
1. [시스템 개요](#시스템-개요)
2. [환경 설정](#환경-설정)
3. [테스트 방법](#테스트-방법)
4. [주요 기능](#주요-기능)
5. [API 문서](#api-문서)
6. [트러블슈팅](#트러블슈팅)

---

## 시스템 개요

### 구현된 기능

✅ **일회성 결제**
- PortOne을 통한 첫 구독 결제
- 플랜 선택 → 결제 페이지 → 구독 활성화

✅ **자동 결제 (정기 결제)**
- 빌링키 기반 자동 갱신
- 매일 새벽 2시 만료 예정 구독 체크
- 자동 결제 및 구독 연장

✅ **구독 관리**
- 다음 결제일 표시
- 자동 갱신 켜기/끄기
- 구독 취소

✅ **결제 수단 관리**
- 카드 등록/삭제
- 빌링키 관리

✅ **플랜 변경**
- 업그레이드/다운그레이드
- 일할 계산 차액 결제

---

## 환경 설정

### 1. Vercel 환경 변수 설정

Vercel 대시보드 → Settings → Environment Variables에 추가:

```bash
# PortOne 설정
PORTONE_API_KEY=your_portone_api_key
PORTONE_API_SECRET=your_portone_api_secret
PORTONE_WEBHOOK_SECRET=your_portone_webhook_secret

# Cron Job 보안
CRON_SECRET=your_random_secret_string

# 애플리케이션 URL
APP_URL=https://your-app.vercel.app
```

### 2. PortOne 대시보드 설정

#### 테스트 모드
1. PortOne 대시보드 로그인
2. **테스트 모드** 활성화
3. **테스트 API 키** 복사 → Vercel 환경 변수에 설정

#### 웹훅 URL 설정
```
https://your-app.vercel.app/api/webhooks/portone
```

#### 리다이렉트 URL 설정
```
성공: https://your-app.vercel.app/api/billing/callback?success=true
실패: https://your-app.vercel.app/api/billing/callback?success=false
```

### 3. Supabase 데이터베이스 설정

#### subscriptions 테이블에 컬럼 추가

```sql
-- auto_renew 컬럼 추가 (자동 갱신 여부)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;

-- cancelled_at 컬럼 추가 (취소 시각)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- billing_key 컬럼 확인 (이미 있어야 함)
-- ALTER TABLE subscriptions 
-- ADD COLUMN IF NOT EXISTS billing_key TEXT;
```

#### payments 테이블에 컬럼 추가

```sql
-- payment_method 컬럼 추가
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- error_message 컬럼 추가
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS error_message TEXT;
```

---

## 테스트 방법

### 1. 로컬 테스트

#### 환경 변수 설정 (.env.local)
```bash
PORTONE_API_KEY=test_api_key
PORTONE_API_SECRET=test_api_secret
PORTONE_WEBHOOK_SECRET=test_webhook_secret
CRON_SECRET=test_cron_secret
APP_URL=http://localhost:3000
```

#### 서버 실행
```bash
npm run dev
```

### 2. 테스트 카드 정보

PortOne 테스트 모드에서 사용 가능한 카드:

```
카드번호: 4242-4242-4242-4242
유효기간: 12/25 (미래 날짜 아무거나)
CVC: 123
생년월일: 900101
비밀번호 앞 2자리: 12
```

### 3. 테스트 시나리오

#### 시나리오 1: 첫 구독
1. 로그인
2. 가격 페이지 → 플랜 선택
3. 결제 진행 (테스트 카드 사용)
4. 설정 페이지에서 구독 확인

#### 시나리오 2: 자동 갱신 설정
1. 설정 페이지 이동
2. 자동 갱신 토글 ON
3. 결제 수단 등록 (테스트 카드)
4. 다음 결제일 확인

#### 시나리오 3: 자동 결제 테스트
```bash
# Cron Job 수동 실행
curl -X GET https://your-app.vercel.app/api/cron/renew-subscriptions \
  -H "Authorization: Bearer your_cron_secret"
```

#### 시나리오 4: 플랜 변경
1. 설정 페이지 → 플랜 변경 버튼
2. 새 플랜 선택
3. 차액 결제 진행
4. 변경된 플랜 확인

---

## 주요 기능

### 1. 자동 결제 스케줄러

**파일**: `app/api/cron/renew-subscriptions/route.ts`

**동작 방식**:
- 매일 새벽 2시 실행 (Vercel Cron)
- 3일 이내 만료 예정 구독 검색
- `auto_renew=true` && `billing_key` 있는 경우만 처리
- 빌링키로 자동 결제
- 성공 시 구독 기간 연장
- 실패 시 재시도 카운트 증가 (3회 실패 시 구독 취소)

**Cron 설정**: `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/renew-subscriptions",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### 2. 구독 관리 UI

**파일**: `app/settings/page.tsx`

**기능**:
- ✅ 현재 구독 정보 표시
- ✅ 다음 결제일 표시
- ✅ 자동 갱신 토글
- ✅ 결제 수단 등록/삭제
- ✅ 플랜 변경
- ✅ 구독 취소

### 3. 결제 수단 관리

**API**: `/api/billing/payment-method`

**POST**: 결제 수단 등록
- 카드 정보 → 빌링키 발급
- 구독에 빌링키 저장
- 자동 갱신 활성화

**DELETE**: 결제 수단 삭제
- 빌링키 삭제
- 자동 갱신 비활성화

### 4. 플랜 변경

**API**: `/api/billing/change-plan`

**기능**:
- 업그레이드: 일할 계산 차액 결제
- 다운그레이드: 다음 결제일부터 적용
- 즉시 플랜 변경

---

## API 문서

### 1. POST /api/checkout
구독 시작 (첫 결제)

**Request**:
```json
{
  "planId": "plan-id"
}
```

**Response**:
```json
{
  "success": true,
  "paymentUrl": "https://portone.io/payment/..."
}
```

### 2. GET /api/cron/renew-subscriptions
자동 갱신 Cron Job

**Headers**:
```
Authorization: Bearer {CRON_SECRET}
```

**Response**:
```json
{
  "success": true,
  "renewed": 5,
  "failed": 1,
  "results": [...]
}
```

### 3. POST /api/billing/payment-method
결제 수단 등록

**Request**:
```json
{
  "cardNumber": "4242424242424242",
  "expiryYear": "25",
  "expiryMonth": "12",
  "birthOrBusinessNumber": "900101",
  "passwordTwoDigits": "12"
}
```

**Response**:
```json
{
  "success": true,
  "message": "결제 수단이 등록되었습니다."
}
```

### 4. DELETE /api/billing/payment-method
결제 수단 삭제

**Response**:
```json
{
  "success": true,
  "message": "결제 수단이 삭제되었습니다."
}
```

### 5. POST /api/billing/change-plan
플랜 변경

**Request**:
```json
{
  "newPlanId": "new-plan-id"
}
```

**Response**:
```json
{
  "success": true,
  "message": "플랜이 변경되었습니다.",
  "priceDifference": 5000
}
```

---

## 트러블슈팅

### 문제 1: 자동 결제가 작동하지 않음

**원인**:
- Vercel Cron이 설정되지 않음
- CRON_SECRET이 설정되지 않음
- billing_key가 없음

**해결**:
1. `vercel.json` 파일 확인
2. Vercel 환경 변수에 `CRON_SECRET` 추가
3. 설정 페이지에서 결제 수단 등록 확인

### 문제 2: 결제 수단 등록 실패

**원인**:
- PortOne API 키가 잘못됨
- 테스트 모드/실제 모드 불일치

**해결**:
1. PortOne 대시보드에서 API 키 재확인
2. 테스트 모드 활성화 확인
3. 환경 변수 재설정 후 재배포

### 문제 3: 웹훅이 작동하지 않음

**원인**:
- 웹훅 URL이 잘못 설정됨
- 서명 검증 실패

**해결**:
1. PortOne 대시보드에서 웹훅 URL 확인:
   ```
   https://your-app.vercel.app/api/webhooks/portone
   ```
2. `PORTONE_WEBHOOK_SECRET` 환경 변수 확인

### 문제 4: Cron Job이 실행되지 않음

**원인**:
- Vercel Pro 플랜이 아님 (Hobby 플랜은 Cron 제한)
- vercel.json이 배포되지 않음

**해결**:
1. Vercel 플랜 확인
2. `vercel.json` 파일이 루트에 있는지 확인
3. 재배포

### 문제 5: 테스트 결제가 실제 결제로 진행됨

**원인**:
- 실제 API 키 사용 중

**해결**:
1. PortOne 대시보드에서 테스트 모드 활성화
2. 테스트 API 키로 변경
3. 환경 변수 업데이트 후 재배포

---

## 실제 운영 전 체크리스트

### 배포 전
- [ ] 모든 환경 변수 설정 완료
- [ ] PortOne 웹훅 URL 설정
- [ ] Supabase 데이터베이스 마이그레이션 완료
- [ ] vercel.json Cron 설정 확인

### 테스트
- [ ] 테스트 모드에서 첫 구독 결제 테스트
- [ ] 자동 갱신 설정 테스트
- [ ] 플랜 변경 테스트
- [ ] 구독 취소 테스트
- [ ] Cron Job 수동 실행 테스트

### 실제 운영
- [ ] PortOne 실제 모드로 전환
- [ ] 실제 API 키로 변경
- [ ] 환경 변수 업데이트
- [ ] 재배포
- [ ] 실제 카드로 소액 테스트

---

## 문의

문제가 발생하면 다음을 확인하세요:
1. Vercel 로그
2. Supabase 로그
3. PortOne 대시보드 트랜잭션 로그
4. 브라우저 콘솔 로그

Happy Coding! 🚀

