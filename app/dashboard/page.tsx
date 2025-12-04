import { requireAuth, getActiveSubscription } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function DashboardPage() {
  const user = await requireAuth();
  const subscription = await getActiveSubscription();
  const supabase = await createClient();

  // Get plan features if subscription exists
  const plan = subscription?.plan as any;
  const features = plan?.features || {};
  
  // Get usage statistics for current month (only if subscription exists)
  let agentUsage = 0;
  let bulkUsage = 0;
  let agentLimit = 0;
  let bulkLimit = 0;
  let agentRemaining = 0;
  let bulkRemaining = 0;

  if (subscription) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    const { data: usageLogs } = await supabase
      .from('usage_logs')
      .select('usage_type, count')
      .eq('user_id', user.id)
      .eq('subscription_id', subscription.id)
      .gte('created_at', startOfMonth);

    // Calculate usage
    agentUsage = usageLogs
      ?.filter(log => log.usage_type === 'agent')
      .reduce((sum, log) => sum + (log.count || 1), 0) || 0;
    
    bulkUsage = usageLogs
      ?.filter(log => log.usage_type === 'bulk')
      .reduce((sum, log) => sum + (log.count || 1), 0) || 0;

    agentLimit = features.service_uses_per_month || 0;
    bulkLimit = features.bulk_mode || 0;
    
    agentRemaining = Math.max(0, agentLimit - agentUsage);
    bulkRemaining = Math.max(0, bulkLimit - bulkUsage);
  }

  // Get user profile for nickname
  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('id', user.id)
    .single();

  const displayName = profile?.nickname || user.email || '사용자';

  // Get user's game history (if needed in the future)
  // For now, we'll show available retro games

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
          안녕하세요, {displayName}님! 빌구독 서비스를 이용해보세요.
        </p>
        {!subscription && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              구독이 필요합니다. <Link href="/pricing" className="font-semibold underline">요금제를 선택하세요</Link>
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {subscription ? (
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
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 mb-8 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">구독이 필요합니다</h3>
          <p className="text-gray-600 mb-4">AI 블로그 글 생성 기능을 사용하려면 구독이 필요합니다.</p>
          <Link
            href="/pricing"
            className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            요금제 보기
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Subscription & Usage */}
        <div className="lg:col-span-1 space-y-6">
          {/* Subscription Status */}
          {subscription ? (
            <>
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
                        style={{ width: `${Math.min(100, agentLimit > 0 ? (agentUsage / agentLimit) * 100 : 0)}%` }}
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
                        style={{ width: `${Math.min(100, bulkLimit > 0 ? (bulkUsage / bulkLimit) * 100 : 0)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      남은 세트: {Math.floor(bulkRemaining / 30)}개
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                구독 상태
              </h2>
              <p className="text-gray-600 text-sm mb-4">구독이 없습니다.</p>
              <Link
                href="/pricing"
                className="inline-block w-full text-center bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all"
              >
                구독하기
              </Link>
            </div>
          )}

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

        {/* Retro Games Arcade */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                레트로 게임 아케이드
              </h2>
              <Link
                href="/dashboard/games"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                전체 보기 →
              </Link>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Tetris */}
              <Link
                href="/games/tetris"
                className="border-2 border-gray-200 rounded-lg p-6 hover:border-purple-500 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="text-5xl group-hover:scale-110 transition-transform">🎮</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">테트리스</h3>
                    <p className="text-sm text-gray-600">클래식 블록 퍼즐 게임</p>
                    <div className="mt-2 text-xs text-gray-500">1984년 출시</div>
                  </div>
                  <div className="text-gray-400 group-hover:text-purple-500">→</div>
                </div>
              </Link>

              {/* 1945 */}
              <Link
                href="/games/1945"
                className="border-2 border-gray-200 rounded-lg p-6 hover:border-purple-500 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="text-5xl group-hover:scale-110 transition-transform">✈️</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">1945</h3>
                    <p className="text-sm text-gray-600">전투기 슈팅 게임</p>
                    <div className="mt-2 text-xs text-gray-500">클래식 슈터</div>
                  </div>
                  <div className="text-gray-400 group-hover:text-purple-500">→</div>
                </div>
              </Link>

              {/* Snake */}
              <Link
                href="/games/snake"
                className="border-2 border-gray-200 rounded-lg p-6 hover:border-purple-500 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="text-5xl group-hover:scale-110 transition-transform">🐍</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">스네이크</h3>
                    <p className="text-sm text-gray-600">뱀을 키워가는 게임</p>
                    <div className="mt-2 text-xs text-gray-500">클래식 아케이드</div>
                  </div>
                  <div className="text-gray-400 group-hover:text-purple-500">→</div>
                </div>
              </Link>

              {/* Pac-Man */}
              <Link
                href="/games/pacman"
                className="border-2 border-gray-200 rounded-lg p-6 hover:border-purple-500 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="text-5xl group-hover:scale-110 transition-transform">👾</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">팩맨</h3>
                    <p className="text-sm text-gray-600">미로 탈출 게임</p>
                    <div className="mt-2 text-xs text-gray-500">1980년 출시</div>
                  </div>
                  <div className="text-gray-400 group-hover:text-purple-500">→</div>
                </div>
              </Link>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center mb-4">
                클래식 레트로 게임을 웹에서 즐겨보세요!
              </p>
              <div className="flex justify-center gap-2">
                <span className="text-xs px-3 py-1 bg-purple-100 text-purple-800 rounded-full">무료 플레이</span>
                <span className="text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded-full">웹 브라우저</span>
                <span className="text-xs px-3 py-1 bg-pink-100 text-pink-800 rounded-full">레트로 스타일</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

