import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';
import PricingCard from '@/components/PricingCard';

export default async function PricingPage() {
  const supabase = await createClient();
  const user = await getUser();

  // Get available plans
  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true });

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          구독 플랜을 선택하세요
        </h1>
        <p className="text-xl text-gray-600">
          프리미엄 콘텐츠에 무제한으로 접근하세요
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {plans?.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            isLoggedIn={!!user}
          />
        ))}
      </div>

      <div className="mt-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          구독 혜택
        </h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-3xl mb-4">🔒</div>
            <h3 className="text-lg font-semibold mb-2">프리미엄 콘텐츠</h3>
            <p className="text-gray-600">
              구독자만 읽을 수 있는 독점적인 글들
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-3xl mb-4">📱</div>
            <h3 className="text-lg font-semibold mb-2">모든 기기에서</h3>
            <p className="text-gray-600">
              언제 어디서나 콘텐츠에 접근 가능
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="text-lg font-semibold mb-2">빠른 업데이트</h3>
            <p className="text-gray-600">
              새로운 콘텐츠를 가장 먼저 확인
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

