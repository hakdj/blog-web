# 포트원(Portone) 서비스 URL 변경 가이드

## 현재 상황
- ✅ Vercel에 배포 완료
- ✅ 배포 URL: `blog-web-five-eta.vercel.app` (또는 다른 도메인)
- ❌ 포트원에 `http://localhost:3000` 등록되어 있음

## 포트원 대시보드에서 URL 변경하기

### 1단계: 포트원 로그인
- 포트원 관리자 페이지 접속: https://admin.portone.io
- 로그인

### 2단계: 사업자 정보 수정
1. 좌측 메뉴에서 **"상점"** 클릭
2. **"계정 관리"** 선택
3. **"사업자 정보"** 탭 클릭 (현재 화면)

### 3단계: 서비스 URL 변경
1. **"서비스 URL"** 필드 찾기
2. 현재 값: `http://localhost:3000`
3. 변경할 값: `https://blog-web-five-eta.vercel.app`
   ```
   기존: http://localhost:3000
   변경: https://blog-web-five-eta.vercel.app
   ```

### 4단계: 저장
- 페이지 하단 **"저장"** 또는 **"수정"** 버튼 클릭
- 변경사항 저장 완료

## 추가로 확인해야 할 설정

### 웹훅 URL 설정 (있는 경우)
포트원 대시보드에서:
1. **"결제 설정"** 또는 **"웹훅 설정"** 메뉴 확인
2. 웹훅 URL을 다음으로 변경:
   ```
   https://blog-web-five-eta.vercel.app/api/webhooks/portone
   ```

### Vercel 환경 변수 업데이트
Vercel 대시보드에서:
1. 프로젝트 → **Settings** → **Environment Variables**
2. `APP_URL` 변수 확인/추가
3. 값 설정:
   ```
   https://blog-web-five-eta.vercel.app
   ```
4. **Save** 클릭

## 확인 사항

### ✅ 포트원 설정 확인
- 서비스 URL: `https://blog-web-five-eta.vercel.app`
- 웹훅 URL: `https://blog-web-five-eta.vercel.app/api/webhooks/portone` (있는 경우)

### ✅ Vercel 환경 변수 확인
- `APP_URL`: `https://blog-web-five-eta.vercel.app`
- `PORTONE_API_KEY`: 포트원에서 발급받은 값
- `PORTONE_API_SECRET`: 포트원에서 발급받은 값
- `PORTONE_WEBHOOK_SECRET`: 포트원에서 발급받은 값

## 테스트

### 웹훅 엔드포인트 테스트
브라우저에서 접속:
```
https://blog-web-five-eta.vercel.app/api/webhooks/portone
```
→ 정상 응답 확인

## 중요 사항

1. **HTTPS 필수**: `https://` 사용 (포트원이 HTTPS를 요구할 수 있음)
2. **정확한 도메인**: Vercel Deployment Details에서 확인한 정확한 도메인 사용
3. **변경 즉시 반영**: 저장 후 바로 적용됨

