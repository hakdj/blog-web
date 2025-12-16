'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ADMIN_EMAILS = ['hakdjhakdj@naver.com'];

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [activeSubscriptions, setActiveSubscriptions] = useState<any[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [agentUsage, setAgentUsage] = useState(0);
  const [bulkUsage, setBulkUsage] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [initPlansLoading, setInitPlansLoading] = useState(false);
  const [initPlansMessage, setInitPlansMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    try {
      setLoading(true);
      
      // 사용자 확인
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // 관리자 확인
      if (!ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) {
        router.push('/');
        return;
      }

      setIsAdmin(true);
      setLoading(false);
      
      // 데이터 로드
      loadAdminData();
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const response = await fetch('/api/admin/data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': user?.email || '',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        setError(errorData.error || `HTTP ${response.status}`);
        return;
      }

      const data = await response.json();
      
      setSubscriptions(data.subscriptions || []);
      setActiveSubscriptions(data.activeSubscriptions || []);
      setTotalUsers(data.totalUsers || 0);
      setAgentUsage(data.agentUsage || 0);
      setBulkUsage(data.bulkUsage || 0);
      setMonthlyRevenue(data.monthlyRevenue || 0);
      setError(null);
    } catch (err: any) {
      console.error('Data load error:', err);
      setError(err.message);
    }
  };

  const handleInitPlans = async () => {
    if (!confirm('플랜을 초기화하시겠습니까? 기존 플랜이 있으면 추가되지 않습니다.')) {
      return;
    }

    setInitPlansLoading(true);
    setInitPlansMessage(null);

    try {
      const response = await fetch('/api/admin/init-plans', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setInitPlansMessage(`✅ ${data.message}`);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setInitPlansMessage(`❌ 오류: ${data.error}`);
      }
    } catch (error: any) {
      setInitPlansMessage(`❌ 오류: ${error.message}`);
    } finally {
      setInitPlansLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-600">관리자 권한이 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">관리자 대시보드</h1>
        <p className="text-gray-600">구독 상태 및 사용량 통계를 확인하세요.</p>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-semibold text-red-800 mb-1">데이터 로드 오류</h3>
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={loadAdminData}
                className="mt-2 text-sm text-red-800 underline hover:text-red-900"
              >
                다시 시도
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 플랜 초기화 버튼 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-yellow-800 mb-1">요금제 플랜 초기화</h3>
            <p className="text-xs text-yellow-700">플랜이 없거나 불러올 수 없을 때 이 버튼을 클릭하세요.</p>
          </div>
          <button
            onClick={handleInitPlans}
            disabled={initPlansLoading}
            className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {initPlansLoading ? '처리 중...' : '플랜 초기화'}
          </button>
        </div>
        {initPlansMessage && (
          <p className={`mt-2 text-sm ${initPlansMessage.includes('✅') ? 'text-green-700' : 'text-red-700'}`}>
            {initPlansMessage}
          </p>
        )}
      </div>

      {/* 통계 카드 */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">전체 사용자</h3>
          <p className="text-3xl font-bold text-gray-900">{totalUsers}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">활성 구독</h3>
          <p className="text-3xl font-bold text-green-600">{activeSubscriptions.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">이번 달 수익</h3>
          <p className="text-3xl font-bold text-blue-600">{monthlyRevenue.toLocaleString()}원</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">이번 달 사용량</h3>
          <p className="text-lg font-semibold text-gray-900">
            에이전트: {agentUsage}회
            <br />
            대량생성: {bulkUsage}회
          </p>
        </div>
      </div>

      {/* 구독 목록 */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">구독 목록</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  사용자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  플랜
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  시작일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  만료일
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subscriptions && subscriptions.length > 0 ? (
                subscriptions.map((sub: any) => (
                  <tr key={sub.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {sub.user?.nickname || sub.user?.email || '알 수 없음'}
                      </div>
                      <div className="text-sm text-gray-500">{sub.user?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{sub.plan?.name || '알 수 없음'}</div>
                      <div className="text-sm text-gray-500">
                        {sub.plan?.price?.toLocaleString()}원 / {sub.plan?.interval === 'month' ? '월' : '년'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          sub.status === 'active' &&
                          new Date(sub.current_period_end) > new Date()
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {sub.status === 'active' &&
                        new Date(sub.current_period_end) > new Date()
                          ? '활성'
                          : '비활성'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(sub.current_period_start).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(sub.current_period_end).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    구독이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6">
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← 홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
