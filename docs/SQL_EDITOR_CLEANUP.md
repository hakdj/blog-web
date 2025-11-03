# Supabase SQL Editor 정리 가이드

## 🤔 기존 SQL 쿼리 파일들은?

### 저장된 쿼리 파일들 (SQL Editor 왼쪽에 있는 것들)
- "SQL Row-Level Security policies for plans, blog_posts and usage_logs"
- "SQL Blog Automation Migration & Plan Seed"  
- "SQL Plans Migration and New Blog/Usage Tables"
- 기타 저장된 쿼리들...

**이것들은 그냥 텍스트 파일입니다!**
- ✅ 데이터베이스에 영향 없음
- ✅ 삭제해도 됨
- ✅ 새로 만들어도 됨

---

## 🗑️ 정리 방법

### 옵션 1: 삭제하기 (권장)

1. Supabase SQL Editor 열기
2. 왼쪽 사이드바에서 **"PRIVATE"** 섹션 펼치기
3. 각 저장된 쿼리 옆의 **"..." (점 3개)** 클릭
4. **"Delete"** 선택
5. 확인

### 옵션 2: 그냥 두기

- 저장된 쿼리는 참고용으로만 사용
- 실제 데이터베이스에 영향 없음
- 필요없으면 무시해도 됨

---

## ✅ 지금 해야 할 것

**저장된 쿼리 파일은 신경쓰지 말고:**

1. SQL Editor에서 **"New Query"** 클릭 (새 탭 열기)
2. `SIMPLE_START.sql` 파일 내용 복사
3. 새 탭에 붙여넣기
4. **"Run"** 실행

**끝!**

---

## 📝 요약

- **저장된 쿼리 파일**: 삭제해도 되고 안 해도 됨 (데이터베이스에 영향 없음)
- **실제 데이터베이스**: `SIMPLE_START.sql` 실행하면 새로 만들어짐
- **결론**: 기존 쿼리 파일은 무시하고 `SIMPLE_START.sql`만 실행하면 됨!


