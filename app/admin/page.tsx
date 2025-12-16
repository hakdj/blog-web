'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ADMIN_EMAILS = ['hakdjhakdj@naver.com'];

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [activeSubscriptions, setActiveSubscriptions] = useState<any[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [agentUsage, setAgentUsage] = useState(0);
  const [bulkUsage, setBulkUsage] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      console.log('🔵 관리자 페이지 로드 시작');
      
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔵 사용자 확인:', user?.email);
      
      if (!user) {
        console.log('❌ 사용자 없음, 로그인 페이지로 이동');
        router.push('/login');
        return;
      }

      // Check admin
      const isAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase() || '');
      console.log('🔵 관리자 체크:', { email: user.email, isAdmin, adminEmails: ADMIN_EMAILS });
      
      if (!isAdmin) {
        console.log('❌ 관리자 아님, 홈으로 이동');
        router.push('/');
        return;
      }
      
      setLoading(true);
      
      console.log('✅ 관리자 확인 완료, API 호출 시작');

      // Load admin data
      console.log('🔵 API 호출 중...');
      const response = await fetch('/api/admin/data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': user.email || '',
        },
        credentials: 'include',
      });

      console.log('🔵 API 응답:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.log('❌ API 오류:', errorData);
        setError(errorData.error || `HTTP ${response.status}`);
        return;
      }

      const data = await response.json();
      console.log('✅ API 데이터 수신:', data);
      
      setSubscriptions(data.subscriptions || []);
      setActiveSubscriptions(data.activeSubscriptions || []);
      setTotalUsers(data.totalUsers || 0);
      setAgentUsage(data.agentUsage || 0);
      setBulkUsage(data.bulkUsage || 0);
      setMonthlyRevenue(data.monthlyRevenue || 0);
      setError(null);
      console.log('✅ 관리자 페이지 로드 완료');
    } catch (err: any) {
      console.error('❌ 오류 발생:', err);
      setError(err.message);
    } finally {
      console.log('🔵 로딩 상태 해제');
      setLoading(false);
    }
  };

  const handleInitPlans = async () => {
    if (!confirm('플랜을 초기화하시겠습니까?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/init-plans', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ ${data.message}`);
        loadAdminData();
      } else {
        alert(`❌ 오류: ${data.error}`);
      }
    } catch (error: any) {
      alert(`❌ 오류: ${error.message}`);
    } finally {
      setLoading(false);
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">관리자 대시보드</h1>
        <p className="text-gray-600">구독 상태 및 사용량 통계</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={loadAdminData}
            className="mt-2 text-sm text-red-800 underline"
          >
            다시 시도
          </button>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-yellow-800">플랜 초기화</h3>
            <p className="text-xs text-yellow-700">플랜이 없을 때 클릭하세요</p>
          </div>
          <button
            onClick={handleInitPlans}
            disabled={loading}
            className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50"
          >
            {loading ? '처리 중...' : '플랜 초기화'}
          </button>
        </div>
      </div>

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
            에이전트: {agentUsage}회<br />대량생성: {bulkUsage}회
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">구독 목록</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사용자</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">플랜</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">시작일</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">만료일</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subscriptions.length > 0 ? (
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
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        sub.status === 'active' && new Date(sub.current_period_end) > new Date()
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {sub.status === 'active' && new Date(sub.current_period_end) > new Date() ? '활성' : '비활성'}
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
        <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
          ← 홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
