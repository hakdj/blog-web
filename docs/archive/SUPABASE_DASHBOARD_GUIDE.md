# Supabase 대시보드 사용 가이드

## 📍 데이터베이스 항목 확인 위치

### 1. SQL Editor (쿼리 실행)
1. Supabase 대시보드 접속: https://app.supabase.com
2. 프로젝트 선택
3. **좌측 메뉴** → **"SQL Editor"** 클릭
4. 여기서 모든 SQL 쿼리를 실행할 수 있습니다

### 2. Table Editor (테이블 데이터 보기/편집)
1. 좌측 메뉴 → **"Table Editor"** 클릭
2. 테이블 목록이 보임
3. 테이블 클릭하면 데이터 확인/편집 가능

### 3. Database (테이블 구조 확인)
1. 좌측 메뉴 → **"Database"** 클릭
2. 하위 메뉴:
   - **Tables**: 테이블 목록 및 구조
   - **Functions**: 함수 목록
   - **Extensions**: 확장 기능
   - **Migrations**: 마이그레이션 내역

### 4. Authentication (인증 관리)
1. 좌측 메뉴 → **"Authentication"** 클릭
2. 사용자 관리, 정책 설정 등

### 5. Settings (설정)
1. 좌측 메뉴 → **"Settings"** (⚙️ 아이콘)
2. 프로젝트 설정 확인

## 🔍 이슈 확인 방법

### 보안 이슈 확인
1. 대시보드 메인 화면 (Home)
2. **"Issues need attention"** 섹션 확인
3. SECURITY 탭 클릭하면 보안 관련 이슈 확인

### 성능 이슈 확인
1. 대시보드 메인 화면
2. **"SLOW QUERIES"** 섹션 확인
3. 느린 쿼리 목록 확인

## 🛠️ 이미지에 나온 이슈 해결하기

### 현재 문제:
- ✅ `usage_logs` 테이블: RLS 미활성화
- ✅ `blog_posts` 테이블: RLS 미활성화  
- ✅ `plans` 테이블: RLS 미활성화

### 해결 방법:

1. **SQL Editor 열기**
   - 좌측 메뉴 → "SQL Editor" → "New Query"

2. **`db/fix-rls-issues.sql` 실행**
   - 파일 내용 복사 & 붙여넣기
   - "Run" 버튼 클릭

3. **확인**
   - 대시보드 새로고침
   - "Issues need attention"에서 해당 이슈들이 사라졌는지 확인

## 📊 주요 메뉴 위치 요약

```
Supabase 대시보드
├── Home (대시보드) - 이슈, 통계 등
├── Table Editor - 데이터 확인/편집
├── SQL Editor ⭐ - 쿼리 실행 (여기서 작업!)
├── Database - 테이블 구조
├── Authentication - 사용자 관리
├── Storage - 파일 저장소
└── Settings - 프로젝트 설정
```

## 💡 팁

- **SQL Editor가 가장 중요**: 모든 스키마 변경은 여기서 실행
- **Table Editor**: 데이터 확인용
- **Database**: 구조 확인용
- 이슈는 **Home** 대시보드에서 확인


