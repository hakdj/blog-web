'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ADMIN_EMAILS = ['hakdjhakdj@naver.com'];

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [activeSubscriptions, setActiveSubscriptions] = useState<any[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [agentUsage, setAgentUsage] = useState(0);
  const [bulkUsage, setBulkUsage] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initPlansLoading, setInitPlansLoading] = useState(false);
  const [initPlansMessage, setInitPlansMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const checkAdminAndLoadData = async () => {
      try {
        // 타임아웃 설정 (10초 후 강제로 로딩 종료)
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('관리자 페이지 로딩 타임아웃 - 강제 종료');
            setLoading(false);
          }
        }, 10000);

        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !currentUser) {
          clearTimeout(timeoutId);
          if (mounted) {
            router.push('/login');
          }
          return;
        }

        const isAdminUser = ADMIN_EMAILS.includes(currentUser.email?.toLowerCase() || '');
        if (!isAdminUser) {
          clearTimeout(timeoutId);
          if (mounted) {
            router.push('/');
          }
          return;
        }

        if (mounted) {
          setUser(currentUser);
          setIsAdmin(true);
          // 관리자 확인 후 즉시 로딩 종료하고 페이지 표시
          setLoading(false);
        }
        
        // 타임아웃 클리어
        clearTimeout(timeoutId);
        
        // 데이터 로드는 백그라운드에서 별도로 실행 (에러가 발생해도 페이지는 표시)
        loadAdminData().catch((err) => {
          console.error('데이터 로드 오류 (백그라운드):', err);
          // 에러가 발생해도 페이지는 이미 표시됨
        });
      } catch (error) {
        console.error('관리자 확인 오류:', error);
        clearTimeout(timeoutId);
        if (mounted) {
          router.push('/');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkAdminAndLoadData();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAdminData = async () => {
    try {
      console.log('관리자 데이터 로드 시작 (API 사용)');
      
      // API 호출에 타임아웃 설정 (15초)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      try {
        // 현재 사용자 정보 가져오기
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        // API를 통해 데이터 가져오기 (서비스 클라이언트 사용하여 RLS 우회)
        const response = await fetch('/api/admin/data', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Email': currentUser?.email || '', // 사용자 이메일을 헤더로 전달
          },
          credentials: 'include', // 쿠키 포함
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: '알 수 없는 오류' }));
          console.error('관리자 데이터 API 오류:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
          });
          
          // 401 또는 403 에러인 경우 권한 문제 (하지만 이미 관리자 확인했으므로 로그만 출력)
          if (response.status === 401 || response.status === 403) {
            console.warn('관리자 데이터 API 권한 오류:', errorData);
            return; // 페이지는 이미 표시되었으므로 리다이렉트하지 않음
          }
          
          throw new Error(errorData.error || `데이터를 불러올 수 없습니다 (${response.status})`);
        }

        const data = await response.json();
        console.log('관리자 데이터 로드 결과:', {
          subscriptions: data.subscriptions?.length || 0,
          activeSubscriptions: data.activeSubscriptions?.length || 0,
          totalUsers: data.totalUsers || 0,
          errors: data.errors?.length || 0,
        });

        // 데이터 설정
        setSubscriptions(data.subscriptions || []);
        setActiveSubscriptions(data.activeSubscriptions || []);
        setTotalUsers(data.totalUsers || 0);
        setAgentUsage(data.agentUsage || 0);
        setBulkUsage(data.bulkUsage || 0);
        setMonthlyRevenue(data.monthlyRevenue || 0);

        // 에러가 있으면 로그만 출력 (데이터는 표시)
        if (data.errors && data.errors.length > 0) {
          console.warn('일부 데이터 로드 실패:', data.errors);
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.warn('관리자 데이터 로드 타임아웃 (15초)');
        } else {
          throw fetchError;
        }
      }
    } catch (error) {
      console.error('데이터 로드 중 예외:', error);
      // 에러가 발생해도 빈 데이터로 페이지는 표시
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
        credentials: 'include', // 쿠키 포함
      });

      const data = await response.json();

      if (data.success) {
        setInitPlansMessage(`✅ ${data.message}`);
        // 페이지 새로고침
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
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">관리자 대시보드</h1>
        <p className="text-gray-600">구독 상태 및 사용량 통계를 확인하세요.</p>
      </div>

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
