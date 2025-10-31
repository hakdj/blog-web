import { createClient } from '@/lib/supabase/server';
import { getUser, getActiveSubscription } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

interface PostPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;
  const supabase = createClient();
  const user = await getUser();
  const subscription = await getActiveSubscription();

  // Get post details
  const { data: post, error } = await supabase
    .from('posts')
    .select(`
      *,
      author:profiles(email)
    `)
    .eq('id', id)
    .single();

  if (error || !post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            포스트를 찾을 수 없습니다
          </h1>
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // Check if post is locked and user doesn't have active subscription
  if (post.is_locked && !subscription) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            프리미엄 콘텐츠입니다
          </h1>
          <p className="text-gray-600 mb-6">
            이 포스트는 구독자만 읽을 수 있습니다. 구독하고 프리미엄 콘텐츠를 확인해보세요.
          </p>
          <div className="space-x-4">
            <Link
              href="/pricing"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              구독하기
            </Link>
            <Link
              href="/"
              className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              홈으로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <article className="bg-white rounded-lg shadow-md p-8">
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              {post.title}
            </h1>
            {post.is_locked && (
              <span className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded-full">
                프리미엄
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              <span>작성자: {post.author?.email}</span>
            </div>
            <div>
              <span>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
            </div>
          </div>
        </header>

        <div className="prose max-w-none">
          <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
            {post.content}
          </div>
        </div>

        <footer className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← 목록으로 돌아가기
            </Link>
            {user && (
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-800 font-medium"
              >
                대시보드
              </Link>
            )}
          </div>
        </footer>
      </article>
    </div>
  );
}

