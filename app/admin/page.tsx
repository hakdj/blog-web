'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ADMIN_EMAILS = ['hakdjhakdj@naver.com'];

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [activeSubscriptions, setActiveSubscriptions] = useState<any[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [agentUsage, setAgentUsage] = useState(0);
  const [bulkUsage, setBulkUsage] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [initPlansLoading, setInitPlansLoading] = useState(false);
  const [initPlansMessage, setInitPlansMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;
    
    const checkAdminAndLoadData = async () => {
      try {
        setIsChecking(true);
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !currentUser) {
          console.error('사용자 인증 오류:', userError);
          if (isMounted) {
            router.push('/login');
          }
          return;
        }

        const isAdminUser = ADMIN_EMAILS.includes(currentUser.email?.toLowerCase() || '');
        console.log('관리자 확인:', {
          email: currentUser.email,
          isAdmin: isAdminUser,
          adminEmails: ADMIN_EMAILS
        });
        
        if (!isAdminUser) {
          console.warn('관리자 권한 없음:', currentUser.email);
          if (isMounted) {
            router.push('/');
          }
          return;
        }

        // 관리자 확인 완료 - 페이지 표시
        if (isMounted) {
          setUser(currentUser);
          setIsAdmin(true);
          setIsChecking(false);
          
          // 데이터 로드 (에러가 발생해도 페이지는 표시)
          loadAdminData();
        }
      } catch (error) {
        console.error('관리자 확인 오류:', error);
        if (isMounted) {
          setIsChecking(false);
          // 에러 발생 시에도 로그인 페이지로 리다이렉트
          router.push('/login');
        }
      }
    };

    checkAdminAndLoadData();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAdminData = async () => {
    try {
      // 현재 사용자 정보 가져오기
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      console.log('관리자 데이터 로드 시작:', currentUser?.email);
      
      // API를 통해 데이터 가져오기
      const response = await fetch('/api/admin/data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': currentUser?.email || '',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '알 수 없는 오류' }));
        console.error('관리자 데이터 API 오류:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        
        // 오류 메시지 설정
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        setLoadError(errorMessage);
        
        // 환경 변수 오류인 경우 사용자에게 알림
        if (errorData.code === 'MISSING_ENV_VAR') {
          alert(`환경 변수 오류: ${errorData.error}\n\n.env.local 파일을 확인하세요.`);
        }
        return; // 에러가 발생해도 페이지는 표시
      }

      const data = await response.json();
      console.log('관리자 데이터 로드 완료:', data);

      // 데이터 설정
      setSubscriptions(data.subscriptions || []);
      setActiveSubscriptions(data.activeSubscriptions || []);
      setTotalUsers(data.totalUsers || 0);
      setAgentUsage(data.agentUsage || 0);
      setBulkUsage(data.bulkUsage || 0);
      setMonthlyRevenue(data.monthlyRevenue || 0);
      setLoadError(null); // 성공 시 에러 메시지 초기화
    } catch (error: any) {
      console.error('데이터 로드 중 예외:', error);
      setLoadError(error.message || '데이터를 불러오는 중 오류가 발생했습니다.');
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

  if (isChecking || !isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
          {!isChecking && !isAdmin && (
            <p className="mt-2 text-sm text-red-600">관리자 권한이 없습니다.</p>
          )}
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

      {/* 에러 메시지 표시 */}
      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-semibold text-red-800 mb-1">데이터 로드 오류</h3>
              <p className="text-sm text-red-700">{loadError}</p>
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
