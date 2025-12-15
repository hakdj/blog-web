import { requireAuth, getActiveSubscription } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function HomePage() {
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
          안녕하세요, {displayName}님! 라떼 방구석 서비스를 이용해보세요.
        </p>
        {!subscription && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              구독하면 더 많은 게임과 제품을 이용할 수 있습니다. <Link href="/pricing" className="font-semibold underline">구독하기</Link>
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions - 레트로 컨셉 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* 그때 그 게임 */}
        <Link
          href="/games"
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg p-6 hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">그때 그 게임</h3>
              <p className="text-purple-100 text-sm">추억의 레트로 게임 플레이</p>
            </div>
            <div className="text-3xl">🎮</div>
          </div>
        </Link>

        {/* 구멍가게 */}
        <Link
          href="/products"
          className={`bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg p-6 hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl ${
            !subscription ? 'opacity-60 cursor-not-allowed' : ''
          }`}
          onClick={(e) => {
            if (!subscription) {
              e.preventDefault();
              alert('구독 유저만 구멍가게에서 제품을 구매할 수 있습니다.');
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">구멍가게</h3>
              <p className="text-orange-100 text-sm">
                {subscription ? '추억의 레트로 제품 구매' : '구독 필요'}
              </p>
            </div>
            <div className="text-3xl">🛍️</div>
          </div>
        </Link>

        {/* 요즘 뭐해? */}
        <Link
          href="/events"
          className="bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg p-6 hover:from-green-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">요즘 뭐해?</h3>
              <p className="text-green-100 text-sm">전국 축제와 이벤트 일정</p>
            </div>
            <div className="text-3xl">📅</div>
          </div>
        </Link>
      </div>

      {/* 구독 유저 전용 기능 */}
      {subscription && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg p-6 mb-8 text-white">
          <h3 className="text-xl font-bold mb-2">✨ 구독 유저 전용 혜택</h3>
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <div className="bg-white/20 rounded-lg p-4">
              <div className="text-2xl mb-2">🎁</div>
              <p className="font-semibold">프리미엄 게임</p>
              <p className="text-sm text-indigo-100">구독 유저만 플레이 가능한 특별 게임</p>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <div className="text-2xl mb-2">🛒</div>
              <p className="font-semibold">구멍가게 할인</p>
              <p className="text-sm text-indigo-100">레트로 제품 구매 시 최대 20% 할인</p>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <div className="text-2xl mb-2">⭐</div>
              <p className="font-semibold">우선 접근</p>
              <p className="text-sm text-indigo-100">신규 게임 및 이벤트 우선 알림</p>
            </div>
          </div>
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

        {/* Content Sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* 2. 운영 모델 섹션 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">2. 운영 모델</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* 레트로게임 */}
              <Link
                href="/games"
                className="border-2 border-gray-200 rounded-lg p-6 hover:border-purple-500 hover:shadow-lg transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl group-hover:scale-110 transition-transform">🎮</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">그때 그 게임</h3>
                    <p className="text-sm text-gray-600 mb-3">클래식 레트로 게임을 즐겨보세요</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">테트리스</span>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">1945</span>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">스네이크</span>
                      <span className="text-xs px-2 py-1 bg-pink-100 text-pink-800 rounded">팩맨</span>
                    </div>
                  </div>
                  <div className="text-gray-400 group-hover:text-purple-500">→</div>
                </div>
              </Link>

              {/* 레트로제품판매 */}
              <Link
                href="/products"
                className="border-2 border-gray-200 rounded-lg p-6 hover:border-orange-500 hover:shadow-lg transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl group-hover:scale-110 transition-transform">🛍️</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">구멍가게</h3>
                    <p className="text-sm text-gray-600 mb-3">추억의 레트로 제품을 만나보세요</p>
                  </div>
                  <div className="text-gray-400 group-hover:text-orange-500">→</div>
                </div>
              </Link>

              {/* 이벤트 일정 */}
              <Link
                href="/events"
                className="border-2 border-gray-200 rounded-lg p-6 hover:border-green-500 hover:shadow-lg transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl group-hover:scale-110 transition-transform">📅</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">이벤트 일정</h3>
                    <p className="text-sm text-gray-600 mb-3">전국 축제, 지역 특색, 지역 광고 정보를 확인하세요</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">축제</span>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">지역 특색</span>
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">지역 광고</span>
                    </div>
                  </div>
                  <div className="text-gray-400 group-hover:text-green-500">→</div>
                </div>
              </Link>

              {/* 추억의 일기장 */}
              <Link
                href="/diary"
                className="border-2 border-gray-200 rounded-lg p-6 hover:border-pink-500 hover:shadow-lg transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl group-hover:scale-110 transition-transform">📔</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">추억의 일기장</h3>
                    <p className="text-sm text-gray-600 mb-3">소중한 추억을 기록하고 공유하세요</p>
                    <div className="text-xs text-gray-500">개인 일기 작성 및 관리</div>
                  </div>
                  <div className="text-gray-400 group-hover:text-pink-500">→</div>
                </div>
              </Link>

              {/* 개인비서 */}
              <Link
                href="/assistant"
                className="border-2 border-gray-200 rounded-lg p-6 hover:border-indigo-500 hover:shadow-lg transition-all group md:col-span-2"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl group-hover:scale-110 transition-transform">🤖</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">라떼 친구</h3>
                    <p className="text-sm text-gray-600 mb-3">일정 관리 및 세부 취미 정보를 제공합니다</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-800 rounded">일정 관리</span>
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">취미 추천</span>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">맞춤 정보</span>
                    </div>
                  </div>
                  <div className="text-gray-400 group-hover:text-indigo-500">→</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
