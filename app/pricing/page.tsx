'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Plan {
  id: string;
  tier: 'basic' | 'starter' | 'pro' | 'enterprise';
  interval: 'month' | 'year';
  name: string;
  price: number;
  features: {
    service_uses_per_month: number;
    agent_mode: number;
    bulk_mode: number;
    storage_months: number;
  };
  is_active: boolean;
}

export default function PricingPage() {
  const [isMonthly, setIsMonthly] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPlans = async () => {
      setIsLoading(true);
      const supabase = createClient();
      const interval = isMonthly ? 'month' : 'year';
      
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('interval', interval)
        .eq('is_active', true)
        .order('price', { ascending: true }');

      if (error) {
        console.error('플랜 가져오기 오류:', error);
        setIsLoading(false);
        return;
      }

      if (data) {
        // tier 순서대로 정렬 (basic → starter → pro → enterprise)
        const tierOrder = { basic: 1, starter: 2, pro: 3, enterprise: 4 };
        const sortedData = data
          .filter((plan: Plan) => plan.interval === interval) // 클라이언트 사이드 추가 필터링
          .sort((a, b) => 
            (tierOrder[a.tier as keyof typeof tierOrder] || 99) - 
            (tierOrder[b.tier as keyof typeof tierOrder] || 99)
          );
        setPlans(sortedData);
      } else {
        setPlans([]);
      }
      setIsLoading(false);
    };

    fetchPlans();
  }, [isMonthly]);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();
  }, []);

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (data.success && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        alert('결제 세션 생성에 실패했습니다: ' + (data.error || '알 수 없는 오류'));
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('구독 처리 중 오류가 발생했습니다.');
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) return '₩0';
    return `₩${price.toLocaleString()}`;
  };

  const getTierName = (tier: string) => {
    const tierNames: Record<string, string> = {
      basic: '베이직',
      starter: '스타터',
      pro: '프로',
      enterprise: '엔터프라이즈',
    };
    return tierNames[tier] || tier;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* 제목 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            요금제
          </h1>

          {/* 월간/연간 토글 - 참고 사이트 스타일 */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex rounded-lg bg-white border border-gray-200 p-1 shadow-sm">
              <button
                onClick={() => setIsMonthly(true)}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  isMonthly
                    ? 'bg-purple-500 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                월간
              </button>
              <button
                onClick={() => setIsMonthly(false)}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  !isMonthly
                    ? 'bg-purple-500 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                연간
              </button>
            </div>
          </div>
        </div>

        {/* 플랜 카드 */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <p className="mt-4 text-gray-600">로딩 중...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {plans.map((plan) => {
              const features = plan.features as Plan['features'];
              return (
                <div
                  key={plan.id}
                  className="relative bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow"
                >
                  {/* 플랜 이름 */}
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                      {getTierName(plan.tier)}
                    </h3>
                    
                    {/* 가격 */}
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-gray-900">
                        {formatPrice(plan.price)}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-gray-600 text-sm ml-1">
                          / {isMonthly ? '월' : '년'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 기능 목록 */}
                  <div className="space-y-4 mb-6">
                    <div className="text-sm text-gray-700">
                      <div className="font-semibold mb-2">월 서비스 이용</div>
                      <div className="text-gray-600">
                        {features.service_uses_per_month}회 이용
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4 space-y-3">
                      <div className="text-sm text-gray-700">
                        <div className="font-semibold mb-1">에이전트 모드</div>
                        <div className="text-gray-600">
                          기준 고품질 글 {features.agent_mode}회 생성 가능
                        </div>
                      </div>

                      <div className="text-sm text-gray-700">
                        <div className="font-semibold mb-1">대량생성 모드</div>
                        <div className="text-gray-600">
                          기준 {features.bulk_mode.toLocaleString()}개 SEO 블로그 글 생성 가능
                        </div>
                      </div>

                      <div className="text-sm text-gray-700">
                        <div className="font-semibold mb-1">데이터 저장</div>
                        <div className="text-gray-600">
                          {features.storage_months}개월간 데이터 저장
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 시작하기 버튼 - 보라색 그라데이션 */}
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    className="w-full py-3 px-6 rounded-lg font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    시작하기
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* 하단 설명 */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-600 max-w-3xl mx-auto">
            모든 플랜은 무제한 편집을 포함하며, 에이전트 모드는 고품질 글 1회, 
            대량생성 모드는 30개 SEO 블로그 글 1세트를 생성합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
