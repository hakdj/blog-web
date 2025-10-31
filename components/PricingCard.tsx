'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Plan {
  id: string;
  name: string;
  interval: 'month' | 'year';
  price: number;
  is_active: boolean;
}

interface PricingCardProps {
  plan: Plan;
  isLoggedIn: boolean;
}

export default function PricingCard({ plan, isLoggedIn }: PricingCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubscribe = async () => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId: plan.id }),
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
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString();
  };

  const getIntervalText = (interval: string) => {
    return interval === 'month' ? '월' : '년';
  };

  const isPopular = plan.interval === 'year';

  return (
    <div className={`relative bg-white rounded-lg shadow-md p-8 ${
      isPopular ? 'ring-2 ring-blue-500' : ''
    }`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-500 text-white text-sm px-4 py-1 rounded-full">
            인기
          </span>
        </div>
      )}

      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          {plan.name}
        </h3>
        <div className="mb-4">
          <span className="text-4xl font-bold text-gray-900">
            {formatPrice(plan.price)}원
          </span>
          <span className="text-gray-600 ml-2">
            / {getIntervalText(plan.interval)}
          </span>
        </div>
        <p className="text-gray-600 mb-6">
          {plan.interval === 'month' 
            ? '월간 구독으로 프리미엄 콘텐츠에 접근하세요'
            : '연간 구독으로 더 많은 혜택을 받으세요'
          }
        </p>

        <button
          onClick={handleSubscribe}
          disabled={isLoading}
          className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
            isPopular
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          } disabled:opacity-50`}
        >
          {isLoading ? '처리 중...' : '구독 시작하기'}
        </button>

        <div className="mt-6 text-sm text-gray-500">
          <p>• 언제든지 취소 가능</p>
          <p>• 모든 프리미엄 콘텐츠 접근</p>
          <p>• 새 콘텐츠 우선 알림</p>
        </div>
      </div>
    </div>
  );
}

