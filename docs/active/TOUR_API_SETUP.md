# 🎉 한국관광공사 Tour API 연동 가이드

## 1. API 키 발급

### 공공데이터포털에서 API 키 받기

1. **공공데이터포털 접속**
   - URL: https://www.data.go.kr

2. **회원가입 및 로그인**

3. **API 검색**
   - 검색어: "한국관광공사_국문 관광정보 서비스"
   - 또는 직접 링크: https://www.data.go.kr/data/15101578/openapi.do

4. **활용신청**
   - "활용신청" 버튼 클릭
   - 활용목적: "관광 정보 제공 웹사이트"
   - 상세기능정보: "축제 정보 조회"

5. **API 키 확인**
   - 마이페이지 → 오픈API → 개발계정 상세
   - 일반 인증키(Encoding) 복사

## 2. 환경 변수 설정

### 로컬 개발 (`.env.local`)
```bash
# 한국관광공사 Tour API
TOUR_API_KEY=your_tour_api_key_here
NEXT_PUBLIC_TOUR_API_KEY=your_tour_api_key_here
```

### Vercel 배포
1. Vercel 대시보드 → 프로젝트 선택
2. **Settings** → **Environment Variables**
3. 다음 변수 추가:
   - `TOUR_API_KEY` = 발급받은 API 키
   - `NEXT_PUBLIC_TOUR_API_KEY` = 발급받은 API 키
4. **Production**, **Preview**, **Development** 모두 체크

## 3. 사용 방법

### 수동 동기화
```bash
# 로컬에서 테스트
curl http://localhost:3000/api/events/sync

# Vercel 배포 후
curl https://your-domain.vercel.app/api/events/sync
```

### 자동 동기화 (Vercel Cron)
- **매일 오전 6시** 자동 실행
- `vercel.json`에 설정됨
- Vercel Pro 플랜 필요

### 관리자 페이지에서 수동 실행
추후 관리자 페이지에 "축제 정보 동기화" 버튼 추가 예정

## 4. API 정보

### 제공되는 정보
- ✅ 축제 제목
- ✅ 시작일/종료일
- ✅ 지역 (서울, 부산, 제주 등)
- ✅ 주소
- ✅ 전화번호
- ✅ 대표 이미지
- ✅ 상세 링크

### 조회 범위
- 현재 날짜부터 **3개월 후**까지의 축제
- 최대 **100개** 조회

### 업데이트 주기
- **매일 오전 6시** 자동 동기화
- 중복 체크: 제목 + 시작일로 확인
- 기존 이벤트는 업데이트, 새 이벤트는 추가

## 5. 문제 해결

### API 키 오류
```
Tour API Key가 설정되지 않았습니다.
```
→ 환경 변수 `TOUR_API_KEY` 확인

### API 응답 없음
```
Tour API 응답에 이벤트가 없습니다.
```
→ 정상 (해당 기간에 축제가 없을 수 있음)

### 동기화 실패
```
이벤트 추가 실패
```
→ Supabase RLS 정책 확인
→ `events` 테이블 권한 확인

## 6. 테스트

### 로컬 테스트
```bash
# 1. 환경 변수 설정
echo "TOUR_API_KEY=your_key" >> .env.local

# 2. 개발 서버 실행
npm run dev

# 3. API 호출
curl http://localhost:3000/api/events/sync

# 4. 이벤트 페이지 확인
http://localhost:3000/events
```

### Vercel 테스트
```bash
# 1. 환경 변수 설정 (Vercel 대시보드)
# 2. 배포 완료 대기
# 3. API 호출
curl https://your-domain.vercel.app/api/events/sync

# 4. 결과 확인
{
  "success": true,
  "message": "15개의 축제 정보가 동기화되었습니다.",
  "synced": 15,
  "skipped": 0,
  "total": 15
}
```

## 7. 참고 링크

- 공공데이터포털: https://www.data.go.kr
- Tour API 문서: https://www.data.go.kr/data/15101578/openapi.do
- 한국관광공사: https://www.visitkorea.or.kr

---

## ✅ 완료!

이제 실제 축제 정보가 자동으로 수집됩니다! 🎉

