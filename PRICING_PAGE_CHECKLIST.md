# 요금제 페이지 체크리스트 ✅

## 완료된 항목

1. ✅ **데이터베이스 업데이트 완료**
   - `db/UPDATE_TO_ALPHABLOG_STRUCTURE.sql` 실행 완료
   - 8개 플랜 데이터 확인 (베이직/스타터/프로/엔터프라이즈 × 월간/연간)

2. ✅ **코드 작성 완료**
   - `app/pricing/page.tsx` - 월간/연간 토글 기능 구현
   - 토글 클릭 시 해당 기간의 4개 플랜만 표시하도록 필터링

## 확인해야 할 항목

### 1. Git 커밋 & 푸시
```bash
git add .
git commit -m "feat: Update pricing page to alphablogogo.com style with monthly/yearly toggle"
git push origin master
```

### 2. Vercel 배포 확인
- Vercel 대시보드에서 최신 커밋이 배포되었는지 확인
- 배포 URL: https://blog-web-five-eta.vercel.app/pricing

### 3. 로컬 테스트 (선택)
```bash
npm run dev
```
- http://localhost:3000/pricing 접속
- 월간/연간 토글이 작동하는지 확인
- 각 토글 클릭 시 4개 플랜만 보이는지 확인

## 예상 문제 및 해결

### 문제 1: 변경사항이 Vercel에 배포되지 않음
**해결:** Git 커밋 후 푸시하면 자동 배포됩니다.

### 문제 2: 데이터베이스에서 features 필드가 JSON 형식이 아님
**해결:** Supabase Table Editor에서 `plans` 테이블의 `features` 컬럼 타입이 `jsonb`인지 확인

### 문제 3: 토글이 작동하지 않음
**해결:** 브라우저 콘솔에서 에러 확인 (`F12` → Console 탭)

## 다음 단계

1. ✅ Supabase에 SQL 실행 완료
2. ⏳ Git 커밋 & 푸시 (필요 시)
3. ⏳ Vercel 자동 배포 대기
4. ⏳ 배포된 사이트에서 테스트


