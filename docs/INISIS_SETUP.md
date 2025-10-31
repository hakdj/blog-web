# KG이니시스 전자계약 설정 가이드

## 1. 환경 변수 설정

`.env.local` 파일에 다음 변수들을 추가하세요:

```env
# KG이니시스 전자계약
INISIS_API_KEY=your_inisis_api_key
INISIS_API_SECRET=your_inisis_api_secret
INISIS_MID=your_inisis_mid
INISIS_WEBHOOK_SECRET=your_inisis_webhook_secret

# 애플리케이션 URL (로컬: localhost, 배포: 실제 도메인)
APP_URL=http://localhost:3000
```

## 2. 로컬 개발 환경 설정

### 방법 1: ngrok 사용 (권장)

1. **ngrok 설치**
   ```bash
   # Windows: Chocolatey 사용
   choco install ngrok
   
   # 또는 공식 사이트에서 다운로드
   # https://ngrok.com/download
   ```

2. **ngrok 실행**
   ```bash
   # Next.js 개발 서버가 localhost:3000에서 실행 중인지 확인
   npm run dev
   
   # 새 터미널에서 ngrok 실행
   ngrok http 3000
   ```

3. **ngrok에서 제공하는 URL 확인**
   ```
   Forwarding: https://xxxx-xxx-xxx-xxx.ngrok.io -> http://localhost:3000
   ```

4. **KG이니시스 설정에서 웹훅 URL 등록**
   - 웹훅 URL: `https://xxxx-xxx-xxx-xxx.ngrok.io/api/webhooks/inisis`
   - 콜백 URL: `https://xxxx-xxx-xxx-xxx.ngrok.io/api/inisis/callback`

5. **환경 변수 업데이트**
   ```env
   APP_URL=https://xxxx-xxx-xxx-xxx.ngrok.io
   ```

### 방법 2: Vercel Preview URL 사용

1. **Git에 푸시**
   ```bash
   git add .
   git commit -m "Add KG이니시스 integration"
   git push
   ```

2. **Vercel에서 자동 배포 확인**
   - Vercel 대시보드에서 Preview URL 확인
   - 예: `https://blog-web2-xxxx.vercel.app`

3. **KG이니시스 설정에서 웹훅 URL 등록**
   - 웹훅 URL: `https://blog-web2-xxxx.vercel.app/api/webhooks/inisis`
   - 콜백 URL: `https://blog-web2-xxxx.vercel.app/api/inisis/callback`

4. **Vercel 환경 변수 설정**
   - Vercel 대시보드 > Settings > Environment Variables
   - `APP_URL` = `https://blog-web2-xxxx.vercel.app`
   - 기타 KG이니시스 관련 변수들 설정

## 3. 프로덕션 배포 설정

### Vercel 환경 변수 설정

1. Vercel 대시보드 접속
2. 프로젝트 > Settings > Environment Variables
3. 다음 변수들 추가:
   - `INISIS_API_KEY`
   - `INISIS_API_SECRET`
   - `INISIS_MID`
   - `INISIS_WEBHOOK_SECRET`
   - `APP_URL` = 프로덕션 도메인 (예: `https://yourdomain.com`)

### KG이니시스 대시보드 설정

1. **웹훅 URL 등록**
   - URL: `https://yourdomain.com/api/webhooks/inisis`
   - 메서드: POST
   - 이벤트: 계약 완료, 계약 취소 등

2. **콜백 URL 설정**
   - 성공: `https://yourdomain.com/api/inisis/callback?success=true`
   - 실패: `https://yourdomain.com/api/inisis/callback?success=false`
   - 취소: `https://yourdomain.com/api/inisis/callback?cancel=true`

## 4. 테스트 방법

### 웹훅 테스트

```bash
# 로컬에서 curl로 테스트
curl -X POST http://localhost:3000/api/webhooks/inisis \
  -H "Content-Type: application/json" \
  -d '{
    "type": "contract.completed",
    "data": {
      "userId": "test-user-id",
      "contractId": "test-contract-id"
    }
  }'
```

### 콜백 테스트

브라우저에서 접속:
```
http://localhost:3000/api/inisis/callback?success=true&contract_id=test-123&user_id=test-user
```

## 5. API 엔드포인트

### 웹훅 엔드포인트
- **URL**: `/api/webhooks/inisis`
- **메서드**: POST
- **용도**: KG이니시스에서 전자계약 이벤트 수신

### 콜백 엔드포인트
- **URL**: `/api/inisis/callback`
- **메서드**: GET
- **용도**: 사용자가 전자계약 완료 후 리다이렉트

## 6. 문제 해결

### 웹훅이 수신되지 않는 경우

1. **ngrok URL 확인**
   ```bash
   # ngrok 대시보드 확인
   http://localhost:4040
   ```

2. **서버 로그 확인**
   ```bash
   # 개발 서버 로그에서 웹훅 수신 여부 확인
   npm run dev
   ```

3. **KG이니시스 웹훅 로그 확인**
   - KG이니시스 대시보드에서 전송 로그 확인

### CORS 오류 발생 시

`next.config.ts`에 다음 추가:
```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/api/webhooks/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'POST, GET, OPTIONS' },
        ],
      },
    ];
  },
};
```

## 7. 참고사항

- ngrok 무료 버전은 URL이 매번 변경됩니다
- 프로덕션에서는 실제 도메인을 사용하세요
- 웹훅 서명 검증은 보안을 위해 필수입니다
- KG이니시스 API 문서에 맞게 실제 구현을 수정해야 합니다

