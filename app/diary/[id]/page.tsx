import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';

interface DiaryEntryPageProps {
  params: { id: string };
}

export default async function DiaryEntryPage({ params }: DiaryEntryPageProps) {
  const user = await requireAuth(); // 로그인 필수
  const supabase = await createClient();

  const { id } = params;

  const { data: entry, error } = await supabase
    .from('diary_entries')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('DiaryEntryPage: Error fetching diary entry:', error);
    notFound(); // 에러 발생 시 404 페이지 표시
  }

  if (!entry) {
    console.warn(`DiaryEntryPage: Diary entry with ID ${id} not found.`);
    notFound(); // 일기가 없으면 404 페이지 표시
  }

  // 일기 소유자이거나, 일기가 공개 설정된 경우에만 접근 허용
  const canView = entry.user_id === user.id || entry.visibility === 'public';

  if (!canView) {
    console.warn(`DiaryEntryPage: User ${user.id} attempted to access private diary ${id}.`);
    // 권한이 없으면 404 페이지 표시 (보안상 403 대신 404가 더 안전함)
    notFound(); 
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">{entry.title}</h1>
        <p className="text-sm text-gray-500">
          {entry.entry_date} · {entry.visibility === 'public' ? '공개' : '비공개'}
        </p>
        {entry.mood && (
          <div className="text-sm text-gray-600">기분: {entry.mood}</div>
        )}
        <p className="whitespace-pre-wrap text-gray-800">{entry.content}</p>
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {entry.tags.map((tag: string) => (
              <span
                key={`${entry.id}-${tag}`}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
        {entry.image_urls && entry.image_urls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {entry.image_urls.map((url: string) => (
              <img key={url} src={url} alt="일기 이미지" className="h-24 w-24 rounded object-cover border" />
            ))}
          </div>
        )}
      </div>
      <div className="mt-8 text-center">
        <Link href="/diary" className="text-blue-600 hover:underline">← 일기 목록으로 돌아가기</Link>
      </div>
    </div>
  );
}
