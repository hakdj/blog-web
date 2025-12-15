'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Plan {
  id: string;
  tier: string;
  interval: 'month' | 'year';
  name: string;
  price: number;
  features: {
    subscription_type?: string;
    rental_limit?: number;
    rental_categories?: string[];
    delivery_fee?: number;
    free_trial?: boolean;
    discount_rate?: number;
  } | string | null | any;
  is_active: boolean;
}

export default function PricingPage() {
  const [isMonthly, setIsMonthly] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPlans = async () => {
      setIsLoading(true);
      setError(null);
      
      // 타임아웃 설정 (15초)
      const timeoutId = setTimeout(() => {
        console.error('플랜 가져오기 타임아웃 (15초 초과)');
        setError('플랜을 불러오는 데 시간이 오래 걸립니다. RLS 정책이나 데이터베이스 연결을 확인해주세요. 관리자 페이지에서 "플랜 초기화" 버튼을 클릭하거나 Supabase에서 RLS 정책을 확인해주세요.');
        setPlans([]);
        setIsLoading(false);
      }, 15000);

      try {
        const interval = isMonthly ? 'month' : 'year';
        
        console.log('플랜 가져오기 시작 (API 사용):', { interval, isMonthly });
        
        // API를 통해 플랜 가져오기 (서버 사이드에서 처리하여 RLS 문제 우회)
        const response = await fetch(`/api/plans?interval=${interval}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        const data = result.plans || [];
        
        console.log('플랜 가져오기 결과:', { 
          dataLength: data?.length, 
          data: data
        });

        clearTimeout(timeoutId);

        if (data && Array.isArray(data)) {
          if (data.length === 0) {
            setError('현재 활성화된 플랜이 없습니다.');
          } else {
            setPlans(data);
            setError(null);
          }
        } else {
          setError('플랜 데이터 형식이 올바르지 않습니다.');
          setPlans([]);
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.error('플랜 가져오기 중 예외:', err);
        setError(`예상치 못한 오류가 발생했습니다: ${err?.message || '알 수 없는 오류'}`);
        setPlans([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, [isMonthly]);

  // 월간 플랜 가져오기 (할인율 계산용)
  const [monthlyPlan, setMonthlyPlan] = useState<Plan | null>(null);
  
  useEffect(() => {
    const fetchMonthlyPlan = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('plans')
          .select('*')
          .eq('interval', 'month')
          .eq('is_active', true)
          .maybeSingle();
        
        if (error) {
          console.error('월간 플랜 가져오기 오류:', error);
          return;
        }
        
        if (data) {
          setMonthlyPlan(data as Plan);
        }
      } catch (err) {
        console.error('월간 플랜 가져오기 중 예외:', err);
      }
    };
    
    fetchMonthlyPlan();
  }, []);

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

  const getTierName = (tier: string, name: string) => {
    // 빌구독은 플랜 이름을 그대로 사용
    return name || '라떼 방구석';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* 제목 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            라떼 방구석 요금제
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            그때 그 게임, 정보, 리뷰를 한 곳에서
          </p>

          {/* 월간/연간 토글 - 참고 사이트 스타일 */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex rounded-lg bg-white border border-gray-200 p-1 shadow-sm">
              <button
                onClick={() => setIsMonthly(true)}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  isMonthly
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                월간
              </button>
              <button
                onClick={() => setIsMonthly(false)}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  !isMonthly
                    ? 'bg-teal-500 text-white shadow-sm'
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
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
            <p className="mt-4 text-gray-600">로딩 중...</p>
          </div>
        ) : plans.length > 0 ? (
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              {plans.map((plan) => {
                // features 안전하게 파싱
                let features: Plan['features'] = {};
                try {
                  if (plan.features) {
                    if (typeof plan.features === 'string') {
                      features = JSON.parse(plan.features);
                    } else if (typeof plan.features === 'object') {
                      features = plan.features as Plan['features'];
                    }
                  }
                } catch (err) {
                  console.warn('Features 파싱 오류:', err);
                  features = {};
                }
                
                const isYearly = plan.interval === 'year';
                const monthlyPrice = isYearly ? Math.round(plan.price / 12) : plan.price;
                
                // 할인율 계산: (월간가격 * 12 - 연간가격) / (월간가격 * 12) * 100
                let discountRate = 0;
                if (isYearly) {
                  if (features.discount_rate) {
                    // features에 할인율이 있으면 사용 (정수로 반올림)
                    discountRate = Math.round(features.discount_rate);
                  } else if (monthlyPlan) {
                    // 할인율이 없으면 계산
                    const calculatedRate = ((monthlyPlan.price * 12 - plan.price) / (monthlyPlan.price * 12)) * 100;
                    discountRate = Math.round(calculatedRate); // 소수점 제거하고 정수로
                  }
                }
                
                return (
                  <div
                    key={plan.id}
                    className="relative bg-white rounded-xl shadow-lg p-8 border-2 border-gray-200 hover:shadow-xl transition-shadow"
                  >
                    {/* 할인 배지 (연간 플랜) */}
                    {isYearly && discountRate > 0 && (
                      <div className="absolute -top-4 right-4 bg-green-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                        {discountRate}% 할인
                      </div>
                    )}

                    {/* 플랜 이름 */}
                    <div className="text-center mb-6">
                      <h3 className="text-3xl font-bold text-gray-900 mb-4">
                        {getTierName(plan.tier, plan.name)}
                      </h3>
                      
                      {/* 가격 */}
                      <div className="mb-2">
                        <span className="text-4xl font-bold text-gray-900">
                          {formatPrice(plan.price)}
                        </span>
                        {plan.price > 0 && (
                          <span className="text-gray-600 text-lg ml-2">
                            / {plan.interval === 'month' ? '월' : '년'}
                          </span>
                        )}
                      </div>
                      
                      {/* 연간 플랜일 경우 월 평균 가격 표시 */}
                      {isYearly && (
                        <p className="text-sm text-gray-500">
                          월 {formatPrice(monthlyPrice)} (연간 결제 시)
                        </p>
                      )}
                    </div>

                    {/* 기능 목록 */}
                    <div className="space-y-4 mb-8">
                      <div className="flex items-center text-gray-700">
                        <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>그때 그 게임 플레이</span>
                      </div>
                      
                      <div className="flex items-center text-gray-700">
                        <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>구멍가게에서 구매</span>
                      </div>
                      
                      <div className="flex items-center text-gray-700">
                        <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>게임 정보 및 리뷰</span>
                      </div>
                      
                      <div className="flex items-center text-gray-700">
                        <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>구멍가게 굿즈 구매</span>
                      </div>
                    </div>

                    {/* 시작하기 버튼 */}
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      className="w-full py-4 px-6 rounded-lg font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 transition-all duration-200 shadow-md hover:shadow-lg text-lg"
                    >
                      구독 시작하기
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <p className="text-red-800 font-semibold mb-2">플랜을 불러올 수 없습니다</p>
              {error && (
                <p className="text-red-600 text-sm mb-4">{error}</p>
              )}
              <button
                onClick={() => {
                  setIsLoading(true);
                  setError(null);
                  const fetchPlans = async () => {
                    try {
                      const supabase = createClient();
                      const interval = isMonthly ? 'month' : 'year';
                      const { data, error: fetchError } = await supabase
                        .from('plans')
                        .select('*')
                        .eq('interval', interval)
                        .eq('is_active', true)
                        .order('price', { ascending: true });
                      
                      if (fetchError) {
                        setError(`오류: ${fetchError.message}`);
                        setIsLoading(false);
                        return;
                      }
                      
                      if (data && data.length > 0) {
                        setPlans(data);
                        setError(null);
                      } else {
                        setError('활성화된 플랜이 없습니다.');
                      }
                    } catch (err: any) {
                      setError(`오류: ${err?.message || '알 수 없는 오류'}`);
                    } finally {
                      setIsLoading(false);
                    }
                  };
                  fetchPlans();
                }}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                다시 시도
              </button>
            </div>
          </div>
        )}

        {/* 하단 설명 */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-600 max-w-3xl mx-auto">
            그때 그 게임 플레이, 구멍가게에서 구매, 정보 및 리뷰를 한 곳에서 즐기세요.
            <br />
            연간 구독 시 16% 할인 혜택을 받으실 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
