import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function HomePage() {
  const supabase = await createClient();
  
  // Get public posts
  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, content, is_locked, created_at')
    .eq('is_locked', false)
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          구독형 블로그에 오신 것을 환영합니다
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          프리미엄 콘텐츠를 구독하고 독점적인 글을 읽어보세요
        </p>
        <div className="space-x-4">
          <Link
            href="/pricing"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            구독 시작하기
          </Link>
          <Link
            href="/login"
            className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            로그인
          </Link>
        </div>
      </div>

      <div className="grid gap-8">
        <h2 className="text-2xl font-bold text-gray-900">최신 포스트</h2>
        {posts && posts.length > 0 ? (
          <div className="grid gap-6">
            {posts.map((post) => (
              <article
                key={post.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {post.title}
                </h3>
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {post.content}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {new Date(post.created_at).toLocaleDateString('ko-KR')}
                  </span>
                  <Link
                    href={`/post/${post.id}`}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    읽기 →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">아직 포스트가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
