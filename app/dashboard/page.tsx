import { requireSubscription } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function DashboardPage() {
  const { user, subscription } = await requireSubscription();
  const supabase = await createClient();

  // Get plan features
  const plan = subscription.plan as any;
  const features = plan?.features || {};
  
  // Get usage statistics for current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  
  const { data: usageLogs } = await supabase
    .from('usage_logs')
    .select('usage_type, count')
    .eq('user_id', user.id)
    .eq('subscription_id', subscription.id)
    .gte('created_at', startOfMonth);

  // Calculate usage
  const agentUsage = usageLogs
    ?.filter(log => log.usage_type === 'agent')
    .reduce((sum, log) => sum + (log.count || 1), 0) || 0;
  
  const bulkUsage = usageLogs
    ?.filter(log => log.usage_type === 'bulk')
    .reduce((sum, log) => sum + (log.count || 1), 0) || 0;

  const agentLimit = features.service_uses_per_month || 0;
  const bulkLimit = features.bulk_mode || 0;
  
  const agentRemaining = Math.max(0, agentLimit - agentUsage);
  const bulkRemaining = Math.max(0, bulkLimit - bulkUsage);

  // Get user's blog posts (created by AI)
  const { data: blogPosts } = await supabase
    .from('blog_posts')
    .select('id, title, content, status, created_at, generated_by')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get user's payment history
  const { data: payments } = await supabase
    .from('payments')
    .select('amount, currency, paid_at, status')
    .eq('user_id', user.id)
    .order('paid_at', { ascending: false })
    .limit(5);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          대시보드
        </h1>
        <p className="text-gray-600">
          안녕하세요, {user.email}님! AI 블로그 글을 생성하고 관리하세요.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <Link
          href="/dashboard/create"
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg p-6 hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">에이전트 모드</h3>
              <p className="text-purple-100 text-sm">고품질 블로그 글 1개 생성</p>
            </div>
            <div className="text-3xl">✨</div>
          </div>
        </Link>
        <Link
          href="/dashboard/create?mode=bulk"
          className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg p-6 hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">대량생성 모드</h3>
              <p className="text-blue-100 text-sm">SEO 블로그 글 30개 세트 생성</p>
            </div>
            <div className="text-3xl">🚀</div>
          </div>
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Subscription & Usage */}
        <div className="lg:col-span-1 space-y-6">
          {/* Subscription Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              구독 상태
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">플랜:</span>
                <span className="font-medium">
                  {plan?.name || '알 수 없음'}
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

          {/* Usage Statistics */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              이번 달 사용량
            </h2>
            <div className="space-y-4">
              {/* Agent Mode Usage */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">에이전트 모드</span>
                  <span className="text-sm font-medium text-gray-900">
                    {agentUsage} / {agentLimit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      agentRemaining > 0 ? 'bg-purple-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, (agentUsage / agentLimit) * 100)}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  남은 횟수: {agentRemaining}회
                </div>
              </div>

              {/* Bulk Mode Usage */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">대량생성 모드</span>
                  <span className="text-sm font-medium text-gray-900">
                    {bulkUsage} / {bulkLimit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      bulkRemaining > 0 ? 'bg-blue-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, (bulkUsage / bulkLimit) * 100)}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  남은 세트: {Math.floor(bulkRemaining / 30)}개
                </div>
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

        {/* Blog Posts */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                최근 생성된 블로그 글
              </h2>
              <Link
                href="/dashboard/posts"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                전체 보기 →
              </Link>
            </div>
            {blogPosts && blogPosts.length > 0 ? (
              <div className="space-y-4">
                {blogPosts.map((post: any) => (
                  <article
                    key={post.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {post.title || '제목 없음'}
                          </h3>
                          <span className={`text-xs px-2 py-1 rounded ${
                            post.status === 'published' 
                              ? 'bg-green-100 text-green-800'
                              : post.status === 'draft'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {post.status === 'published' ? '발행됨' : 
                             post.status === 'draft' ? '초안' : '보관됨'}
                          </span>
                          {post.generated_by && (
                            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                              {post.generated_by === 'agent' ? '에이전트' : '대량생성'}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2 line-clamp-2">
                          {post.content?.substring(0, 200) || '내용 없음'}...
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            {new Date(post.created_at).toLocaleDateString('ko-KR')}
                          </span>
                          <div className="flex gap-2">
                            <Link
                              href={`/dashboard/posts/${post.id}`}
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                            >
                              보기 →
                            </Link>
                            <Link
                              href={`/dashboard/posts/${post.id}/edit`}
                              className="text-gray-600 hover:text-gray-800 font-medium text-sm"
                            >
                              수정
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-gray-500 mb-4">아직 생성된 블로그 글이 없습니다.</p>
                <Link
                  href="/dashboard/create"
                  className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all"
                >
                  첫 번째 글 생성하기
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

