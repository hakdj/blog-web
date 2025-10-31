# KG이니시스 웹사이트 URL 변경 가이드

## 현재 상황
- ✅ Vercel에 배포 완료
- ✅ 배포 URL: `blog-web-five-eta.vercel.app` (또는 다른 도메인)
- ❌ KG이니시스에 `localhost:3000` 등록되어 있음

## KG이니시스 대시보드에서 URL 변경하기

### 1단계: KG이니시스 로그인
- KG이니시스 관리자 페이지 접속
- https://ini.kginisis.com/ 또는 KG이니시스 제공 관리자 페이지

### 2단계: 설정 메뉴 찾기
다음 중 하나의 메뉴에서 설정할 수 있습니다:
- **"서비스 관리"** 또는 **"Service Management"**
- **"API 설정"** 또는 **"API Settings"**
- **"웹사이트 설정"** 또는 **"Website Settings"**
- **"전자계약 설정"** 또는 **"Electronic Contract Settings"**
- **"웹훅 설정"** 또는 **"Webhook Settings"**

### 3단계: URL 변경
다음 항목들을 찾아서 변경:

#### 3-1. 웹사이트 URL
```
기존: http://localhost:3000
변경: https://blog-web-five-eta.vercel.app
```

#### 3-2. 웹훅 URL (있는 경우)
```
기존: http://localhost:3000/api/webhooks/inisis
변경: https://blog-web-five-eta.vercel.app/api/webhooks/inisis
```

#### 3-3. 콜백 URL (있는 경우)
```
기존: http://localhost:3000/api/inisis/callback
변경: https://blog-web-five-eta.vercel.app/api/inisis/callback
```

#### 3-4. 리다이렉트 URL (있는 경우)
```
기존: http://localhost:3000/api/inisis/callback?success=true
변경: https://blog-web-five-eta.vercel.app/api/inisis/callback?success=true
```

### 4단계: Vercel 환경 변수도 업데이트
Vercel 대시보드에서:
1. 프로젝트 선택 → **Settings** → **Environment Variables**
2. `APP_URL` 변수 찾기 (없으면 추가)
3. 값 변경:
   ```
   APP_URL=https://blog-web-five-eta.vercel.app
   ```
4. **Save** 클릭
5. 환경 변수 변경 후 재배포가 필요할 수 있음

### 5단계: 저장 및 확인
- KG이니시스에서 **"저장"** 또는 **"적용"** 버튼 클릭
- 변경사항이 반영되었는지 확인

## ⚠️ 주의사항

1. **HTTPS 필수**: Vercel은 자동으로 HTTPS를 제공하므로 `https://` 사용
2. **도메인 확인**: Vercel Deployment Details 페이지에서 정확한 도메인 확인
3. **재배포**: 환경 변수 변경 후 Vercel에서 자동 재배포되거나 수동 재배포 필요

## 문제 발생 시

### KG이니시스 대시보드에서 설정 메뉴를 못 찾는 경우:
1. **고객지원 문의**: KG이니시스 고객센터에 문의하여 설정 위치 안내 요청
2. **문서 확인**: KG이니시스 제공 개발자 문서에서 "웹사이트 URL 변경" 검색
3. **담당자에게 문의**: KG이니시스 담당 영업 또는 기술 담당자에게 문의

### URL이 작동하지 않는 경우:
1. Vercel 배포가 완료되었는지 확인
2. 브라우저에서 직접 접속 테스트:
   ```
   https://blog-web-five-eta.vercel.app/api/webhooks/inisis
   ```
   → GET 요청이면 JSON 응답이 와야 함

## 테스트 방법

### 웹훅 엔드포인트 테스트
브라우저에서:
```
https://blog-web-five-eta.vercel.app/api/webhooks/inisis
```
→ `{"message":"KG이니시스 웹훅 엔드포인트","status":"active",...}` 응답 확인

### 콜백 엔드포인트 테스트
브라우저에서:
```
https://blog-web-five-eta.vercel.app/api/inisis/callback?success=true&contract_id=test
```
→ `/pricing` 페이지로 리다이렉트되는지 확인

