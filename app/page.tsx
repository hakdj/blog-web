import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // 구독 상태 확인
  let hasSubscription = false;
  let subscriptionInfo: any = null;
  
  if (user) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, current_period_end, status, plan_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    
    if (subscription) {
      // 플랜 정보 별도로 가져오기
      const { data: plan } = await supabase
        .from('plans')
        .select('name, price, interval')
        .eq('id', subscription.plan_id)
        .single();
      
      hasSubscription = true;
      subscriptionInfo = {
        ...subscription,
        plan: plan
      };
    }
  }

  // 인기 공개 일기 가져오기 (최신 공개 일기 1개)
  const { data: popularDiary, error: diaryError } = await supabase
    .from('diary_entries')
    .select('id, title, content')
    .eq('visibility', 'public')
    .order('views', { ascending: false, nullsFirst: false }) // Sort by views descending
    .order('created_at', { ascending: false }) // Fallback sort
    .limit(1)
    .maybeSingle();

  if (diaryError) {
    console.error('HomePage: Error fetching popular diary:', diaryError);
  } else if (!popularDiary) {
    console.log('HomePage: No popular diary found.');
  } else {
    console.log('HomePage: Fetched popular diary:', popularDiary);
  }

  // 추천 유저 광고 가져오기 (활성 광고 1개)
  const { data: featuredAd, error: adError } = await supabase
    .from('user_ads')
    .select('id, title, description, image_url, link_url')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 베스트 게이머 랭킹 가져오기 (최고 점수 1개)
  let topRanker: any = null;
  try {
    // Note: process.env.NEXT_PUBLIC_APP_URL이 Vercel 환경 변수에 설정되어 있어야 합니다.
    // 로컬 개발 환경에서는 http://localhost:3000 으로 작동합니다.
    const rankingResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/games/ranking?limit=1`);
    const rankingData = await rankingResponse.json();
    if (rankingResponse.ok && rankingData.rankings && rankingData.rankings.length > 0) {
      topRanker = rankingData.rankings[0];
    }
  } catch (e) {
    console.error('Error fetching top ranker:', e);
  }

  // 로그인 안 했거나, 로그인했지만 구독 없으면 CTA 표시
  const showCTA = !user || !hasSubscription;

  // 남은 일수 계산
  const getDaysRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50">
      {/* 구독 정보 배너 */}
      {subscriptionInfo && (
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-2xl">✨</span>
              <div>
                <p className="font-bold text-lg">
                  {subscriptionInfo.plan?.name || '구독 중'}
                </p>
                <p className="text-sm opacity-90">
                  {getDaysRemaining(subscriptionInfo.current_period_end)}일 남음 · 
                  다음 결제일: {new Date(subscriptionInfo.current_period_end).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </div>
            <a
              href="/settings"
              className="bg-white text-purple-600 px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-100 transition-colors"
            >
              구독 관리
            </a>
          </div>
        </div>
      )}
      
      {/* Hero Section - 레트로 감성 */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-extrabold mb-6 tracking-tight text-[#E60074] leading-none">
            라떼 방구석
          </h1>
          <p className="text-2xl text-gray-700 mb-4">
            라떼방구석(Latte Room)에서 그때 그 시절을 다시 만나다
          </p>
          <p className="text-lg text-gray-600 mb-8">
            90년대 감성 게임, 제품, 이벤트를 한 곳에서
          </p>
          {showCTA && (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-full text-lg font-bold hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              <span>✨</span> 지금 시작하기
            </Link>
          )}
        </div>

        {/* Features Grid - 레트로 카테고리 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-16">
          {/* 그때 그 게임 */}
          <Link href="/games">
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transform hover:scale-105 transition-all duration-300 cursor-pointer border-4 border-purple-200">
              <div className="text-6xl mb-4 text-center">🎮</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                그때 그 게임
              </h3>
              <p className="text-gray-600 text-center">
                추억의 레트로 게임
              </p>
            </div>
          </Link>

          {/* 요즘 뭐해? */}
          <Link href="/events">
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transform hover:scale-105 transition-all duration-300 cursor-pointer border-4 border-pink-200">
              <div className="text-6xl mb-4 text-center">📅</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                요즘 뭐해?
              </h3>
              <p className="text-gray-600 text-center">
                이벤트/축제 일정
              </p>
            </div>
          </Link>

          {/* 구멍가게 */}
          <Link href="/products">
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transform hover:scale-105 transition-all duration-300 cursor-pointer border-4 border-yellow-200">
              <div className="text-6xl mb-4 text-center">🏪</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                구멍가게
              </h3>
              <p className="text-gray-600 text-center">
                추억의 물건 대여
              </p>
            </div>
          </Link>

          {/* 추억의 일기장 */}
          <Link href="/diary">
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transform hover:scale-105 transition-all duration-300 cursor-pointer border-4 border-green-200">
              <div className="text-6xl mb-4 text-center">📔</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                추억의 일기장
              </h3>
              <p className="text-gray-600 text-center">
                나만의 일기 쓰기
              </p>
            </div>
          </Link>

          {/* 라떼 친구 */}
          <Link href="/assistant">
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transform hover:scale-105 transition-all duration-300 cursor-pointer border-4 border-orange-200">
              <div className="text-6xl mb-4 text-center">🤖</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                라떼 친구
              </h3>
              <p className="text-gray-600 text-center">
                AI 어시스턴트
              </p>
            </div>
          </Link>
        </div>

        {/* Premium Subscription Emphasis Section - 유료 구독 강조 */}
        {!hasSubscription && (
          <div className="bg-gradient-to-r from-teal-500 to-cyan-600 rounded-3xl shadow-2xl p-12 text-center text-white mb-16">
            <h2 className="text-4xl font-bold mb-4">
              💎 프리미엄 구독으로 모든 추억을 무제한으로!
            </h2>
            <p className="text-xl mb-8 opacity-90">
              AI 일기 분석, 전체 레트로 게임, 나만의 광고 등록까지!
            </p>
            <Link
              href="/pricing"
              className="inline-block bg-white text-teal-600 px-8 py-4 rounded-full text-lg font-bold hover:bg-gray-100 transition-colors"
            >
              프리미엄 요금제 보기
            </Link>
          </div>
        )}

        {/* Social Proof Section - 사회적 증명 (인기 콘텐츠) */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
            💖 지금 가장 뜨거운 추억들
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularDiary && (
              <div className="bg-white rounded-2xl shadow-lg p-8 border-4 border-yellow-100 flex flex-col items-center justify-center text-center">
                <div className="text-6xl mb-4">🔥</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">인기 공개 일기</h3>
                <p className="text-gray-600 mb-4 line-clamp-2">{popularDiary.title}: {popularDiary.content}</p>
                <Link href={`/diary/${popularDiary.id}`} className="text-blue-600 hover:underline font-medium">더 보기 →</Link>
              </div>
            )}
            {!popularDiary && ( // Placeholder if no diary entry
                <div className="bg-white rounded-2xl shadow-lg p-8 border-4 border-yellow-100 flex flex-col items-center justify-center text-center">
                    <div className="text-6xl mb-4">🔥</div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">인기 공개 일기</h3>
                    <p className="text-gray-600 mb-4">아직 인기 공개 일기가 없습니다. 첫 일기를 작성해보세요!</p>
                    <Link href="/diary?scope=public" className="text-blue-600 hover:underline font-medium">더 보기 →</Link>
                </div>
            )}

            {topRanker && (
              <div className="bg-white rounded-2xl shadow-lg p-8 border-4 border-green-100 flex flex-col items-center justify-center text-center">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">베스트 게이머 랭킹</h3>
                <p className="text-gray-600 mb-4">
                  {topRanker.nickname} 님: {topRanker.best_score.toLocaleString()}점 ({topRanker.game_id})
                </p>
                <Link href="/games" className="text-blue-600 hover:underline font-medium">더 보기 →</Link>
              </div>
            )}
            {!topRanker && ( // Placeholder if no top ranker
                <div className="bg-white rounded-2xl shadow-lg p-8 border-4 border-green-100 flex flex-col items-center justify-center text-center">
                    <div className="text-6xl mb-4">🏆</div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">베스트 게이머 랭킹</h3>
                    <p className="text-gray-600 mb-4">아직 베스트 게이머가 없습니다. 첫 기록을 세워보세요!</p>
                    <Link href="/games" className="text-blue-600 hover:underline font-medium">더 보기 →</Link>
                </div>
            )}

            {featuredAd && (
              <div className="bg-white rounded-2xl shadow-lg p-8 border-4 border-pink-100 flex flex-col items-center justify-center text-center">
                <div className="text-6xl mb-4">📣</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">추천 유저 광고</h3>
                {featuredAd.image_url && <img src={featuredAd.image_url} alt={featuredAd.title} className="w-24 h-24 object-cover rounded-lg mb-3" />}
                <p className="text-gray-600 mb-4 line-clamp-2">{featuredAd.description}</p>
                <Link href={featuredAd.link_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">더 보기 →</Link>
              </div>
            )}
            {!featuredAd && ( // Placeholder if no featured ad
                <div className="bg-white rounded-2xl shadow-lg p-8 border-4 border-pink-100 flex flex-col items-center justify-center text-center">
                    <div className="text-6xl mb-4">📣</div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">추천 유저 광고</h3>
                    <p className="text-gray-600 mb-4">아직 추천 유저 광고가 없습니다. 첫 광고를 등록해보세요!</p>
                    <Link href="/ads" className="text-blue-600 hover:underline font-medium">더 보기 →</Link>
                </div>
            )}
          </div>
        </div>

        {/* CTA Section - 로그인 안 했거나 구독 없을 때만 표시 */}
        {showCTA && (
          <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 rounded-3xl shadow-2xl p-12 text-center text-white mb-16">
            <h2 className="text-4xl font-bold mb-4">
              🎉 지금 가입하고 추억을 되살려보세요!
            </h2>
            <p className="text-xl mb-8 opacity-90">
              다양한 요금제로 모든 콘텐츠 무제한 이용
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/pricing"
                className="bg-white text-purple-600 px-8 py-4 rounded-full text-lg font-bold hover:bg-gray-100 transition-colors"
              >
                요금제 보기
              </Link>
              {!user && (
                <Link
                  href="/login"
                  className="bg-purple-800 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-purple-900 transition-colors"
                >
                  로그인
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Features List */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-5xl mb-4">✨</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              90년대 감성
            </h3>
            <p className="text-gray-600">
              그때 그 시절의 향수를 느껴보세요
            </p>
          </div>
          <div className="text-center">
            <div className="text-5xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              다양한 콘텐츠
            </h3>
            <p className="text-gray-600">
              게임, 제품, 이벤트를 한 곳에서
            </p>
          </div>
          <div className="text-center">
            <div className="text-5xl mb-4">💝</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              합리적인 가격
            </h3>
            <p className="text-gray-600">
              합리적인 요금으로 무제한 이용
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
