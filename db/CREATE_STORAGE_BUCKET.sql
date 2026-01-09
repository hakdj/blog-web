-- ============================================
-- Supabase Storage 버킷 설정
-- ============================================
-- 작성일: 2026년 1월 9일
-- 목적: 광고 이미지 업로드를 위한 Storage 버킷 생성 및 정책 설정

-- 1. 'public' 버킷이 없으면 생성 (이미 있을 수 있음)
INSERT INTO storage.buckets (id, name, public)
VALUES ('public', 'public', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage 정책 설정

-- 기존 정책 삭제 (있을 경우)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- 모든 사람이 public 버킷의 파일을 볼 수 있음
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'public');

-- 인증된 사용자만 업로드 가능
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'public' 
  AND auth.role() = 'authenticated'
);

-- 본인이 업로드한 파일만 수정 가능
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'public' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'public' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 본인이 업로드한 파일만 삭제 가능
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'public' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. 파일 크기 제한 설정 (선택사항)
-- Supabase 대시보드에서 설정:
-- Storage > public 버킷 > Settings
-- - Max file size: 5MB
-- - Allowed MIME types: image/jpeg, image/png, image/gif, image/webp

-- 4. 확인 쿼리
-- SELECT * FROM storage.buckets WHERE id = 'public';
-- SELECT * FROM storage.objects WHERE bucket_id = 'public' ORDER BY created_at DESC LIMIT 10;
