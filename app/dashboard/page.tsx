import { requireSubscription } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function DashboardPage() {
  const { user, subscription } = await requireSubscription();
  const supabase = createClient();

  // Get all posts (including locked ones for subscribers)
  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, content, is_locked, created_at')
    .order('created_at', { ascending: false });

  // Get user's payment history
  const { data: payments } = await supabase
    .from('payments')
    .select('amount, currency, paid_at, status')
    .eq('user_id', user.id)
    .order('paid_at', { ascending: false })
    .limit(5);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          대시보드
        </h1>
        <p className="text-gray-600">
          안녕하세요, {user.email}님! 구독 상태를 확인하고 프리미엄 콘텐츠를 읽어보세요.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Subscription Status */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              구독 상태
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">플랜:</span>
                <span className="font-medium">
                  {subscription.plan?.name || '알 수 없음'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">상태:</span>
                <span className={`font-medium ${
                  subscription.status === 'active' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {subscription.status === 'active' ? '활성' : subscription.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">만료일:</span>
                <span className="font-medium">
                  {new Date(subscription.current_period_end).toLocaleDateString('ko-KR')}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Payments */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              최근 결제 내역
            </h2>
            {payments && payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map((payment, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <div>
                      <div className="font-medium">
                        {payment.amount.toLocaleString()}원
                      </div>
                      <div className="text-sm text-gray-500">
                        {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString('ko-KR') : '-'}
                      </div>
                    </div>
                    <span className={`text-sm px-2 py-1 rounded ${
                      payment.status === 'paid' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {payment.status === 'paid' ? '완료' : payment.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">결제 내역이 없습니다.</p>
            )}
          </div>
        </div>

        {/* Posts */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              모든 포스트
            </h2>
            {posts && posts.length > 0 ? (
              <div className="space-y-4">
                {posts.map((post) => (
                  <article
                    key={post.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {post.title}
                          </h3>
                          {post.is_locked && (
                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                              프리미엄
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2 line-clamp-2">
                          {post.content}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            {new Date(post.created_at).toLocaleDateString('ko-KR')}
                          </span>
                          <Link
                            href={`/post/${post.id}`}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            읽기 →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">아직 포스트가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

