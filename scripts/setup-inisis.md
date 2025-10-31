# KG이니시스 로컬 테스트 설정 단계별 가이드

## 🚀 빠른 시작

### 옵션 1: ngrok 사용 (권장 - KG이니시스 웹훅 테스트 가능)

1. **ngrok 다운로드 및 설치**
   - https://ngrok.com/download
   - 또는 Chocolatey: `choco install ngrok`

2. **Next.js 개발 서버 실행**
   ```bash
   npm run dev
   ```

3. **새 터미널에서 ngrok 실행**
   ```bash
   ngrok http 3000
   ```

4. **ngrok URL 확인**
   - 터미널에 표시되는 URL 복사 (예: `https://abcd-1234-5678.ngrok.io`)
   - 또는 http://localhost:4040 접속 (ngrok 웹 인터페이스)

5. **`.env.local` 파일의 APP_URL 수정**
   ```env
   APP_URL=https://abcd-1234-5678.ngrok.io
   ```

6. **KG이니시스 대시보드 설정**
   - 웹훅 URL: `https://abcd-1234-5678.ngrok.io/api/webhooks/inisis`
   - 콜백 URL: `https://abcd-1234-5678.ngrok.io/api/inisis/callback`

### 옵션 2: Vercel Preview URL 사용 (간단함)

1. **Git에 커밋 및 푸시**
   ```bash
   git add .
   git commit -m "Add KG이니시스 integration"
   git push
   ```

2. **Vercel에서 자동 배포 확인**
   - Vercel 대시보드에서 Preview URL 확인

3. **Vercel 환경 변수에 KG이니시스 설정 추가**
   - Settings > Environment Variables
   - INISIS_API_KEY, INISIS_API_SECRET, INISIS_MID, INISIS_WEBHOOK_SECRET 추가

4. **KG이니시스 대시보드에서 Preview URL로 웹훅 설정**

---

## 📝 체크리스트

- [ ] `.env.local` 파일 생성 및 값 입력
- [ ] Next.js 개발 서버 실행 (`npm run dev`)
- [ ] ngrok 설치 및 실행 (또는 Vercel Preview 사용)
- [ ] KG이니시스 대시보드에서 웹훅 URL 등록
- [ ] 웹훅 테스트 (KG이니시스 테스트 기능 또는 curl)

---

## 🧪 테스트

### 웹훅 엔드포인트 테스트
```bash
curl -X POST http://localhost:3000/api/webhooks/inisis \
  -H "Content-Type: application/json" \
  -d '{"type":"contract.completed","data":{"userId":"test","contractId":"test123"}}'
```

### 콜백 엔드포인트 테스트
브라우저에서:
```
http://localhost:3000/api/inisis/callback?success=true&contract_id=test-123
```

