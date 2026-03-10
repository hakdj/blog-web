'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const ADMIN_EMAILS = ['hakdjhakdj@naver.com', 'hakdjhakdj@gmail.com'];

interface Plan {
  id: string;
  name: string;
  price: number;
  tier: string;
  features: string[];
}

interface Subscriber {
  id: string;
  email: string;
  plan_name: string;
  plan_price: number;
  created_at: string;
  current_period_end: string;
}

interface Member {
  id: string;
  email: string;
  created_at: string;
  subscription?: {
    plan_name: string;
    plan_price: number;
    current_period_end: string;
  };
}

interface AdminData {
  totalUsers: number;
  paidMembers: number;
  freeMembers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  recentUsers: Array<{
    email: string;
    created_at: string;
  }>;
  subscribers: Subscriber[];
  paidMembersList: Member[];
  freeMembersList: Member[];
}

interface AiProviderMetric {
  provider: 'openai' | 'anthropic' | 'google';
  total: number;
  successRate: number;
  error4xx: number;
  error5xx: number;
}

interface EventSourceStatus {
  source: string;
  last_attempt_at?: string | null;
  last_success_at?: string | null;
  last_status?: 'ok' | 'error' | null;
  last_error?: string | null;
  last_count?: number | null;
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newPlan, setNewPlan] = useState({ name: '', price: '', tier: 'custom', interval: 'month', features: '' });
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'revenue' | 'paid-members' | 'free-members' | 'test-payment'>('overview');
  const [selectedUser, setSelectedUser] = useState<Member | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [testPaymentAmount, setTestPaymentAmount] = useState('100');
  const [testPaymentLoading, setTestPaymentLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'test' | 'live'>('test');
  const [syncingEvents, setSyncingEvents] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showRevenue, setShowRevenue] = useState(false);
  const [showRevenueDetails, setShowRevenueDetails] = useState(false);
  const [aiMetrics, setAiMetrics] = useState<AiProviderMetric[]>([]);
  const [eventSourceStatus, setEventSourceStatus] = useState<EventSourceStatus[]>([]);
  const [syncStatusLoading, setSyncStatusLoading] = useState(false);
  const [syncStatusError, setSyncStatusError] = useState<string | null>(null);
  const [expandedSyncSource, setExpandedSyncSource] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    checkAdminAndLoadData();
    // 결제 모드 확인
    const mode = process.env.NEXT_PUBLIC_PORTONE_MODE || 'test';
    setPaymentMode(mode as 'test' | 'live');
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadSubscriptionHistory();
    }
  }, [activeTab]);

  const checkAdminAndLoadData = async () => {
    try {
      console.log('Admin - Starting admin check...');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Admin - Error getting user:', userError);
        setError('인증 오류가 발생했습니다.');
        setLoading(false);
        return;
      }

      if (!user) {
        console.log('Admin - No user found, redirecting to login');
        router.push('/login');
        return;
      }

      console.log('Admin - User email:', user.email);
      
      const adminCheck = ADMIN_EMAILS.includes(user.email || '');
      console.log('Admin - Is admin:', adminCheck);
      
      setIsAdmin(adminCheck);

      if (!adminCheck) {
        console.log('Admin - Not an admin, redirecting');
        setError('관리자 권한이 없습니다.');
        setLoading(false);
        return;
      }

      // Admin confirmed, now load data
      setLoading(true);
      await Promise.all([loadAdminData(), loadPlans(), loadAiMetrics(), loadSyncStatus()]);
      
    } catch (error) {
      console.error('Admin - Exception in checkAdminAndLoadData:', error);
      setError('오류가 발생했습니다: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    try {
      console.log('Admin - Loading admin data...');
      const response = await fetch('/api/admin/data');
      
      const data = await response.json();
      console.log('Admin - Data loaded:', data);
      
      // Even if there's an error field, use the data provided
      if (data.error) {
        console.warn('Admin - API returned error but continuing with default data:', data.error);
      }
      
      setAdminData({
        totalUsers: data.totalUsers || 0,
        paidMembers: data.paidMembers || 0,
        freeMembers: data.freeMembers || 0,
        activeSubscriptions: data.activeSubscriptions || 0,
        totalRevenue: data.totalRevenue || 0,
        recentUsers: data.recentUsers || [],
        subscribers: data.subscribers || [],
        paidMembersList: data.paidMembersList || [],
        freeMembersList: data.freeMembersList || []
      });
    } catch (error) {
      console.error('Admin - Error loading data:', error);
      // Set default data instead of showing error
      setAdminData({
        totalUsers: 0,
        paidMembers: 0,
        freeMembers: 0,
        activeSubscriptions: 0,
        totalRevenue: 0,
        recentUsers: [],
        subscribers: [],
        paidMembersList: [],
        freeMembersList: []
      });
    }
  };

  const loadPlans = async () => {
    try {
      console.log('Admin - Loading plans...');
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price', { ascending: true });

      if (error) {
        console.error('Admin - Error loading plans:', error);
        // Don't throw, just set empty array
        setPlans([]);
        return;
      }

      console.log('Admin - Plans loaded:', data);
      
      // Ensure features is always an array
      const normalizedPlans = (data || []).map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : []
      }));
      
      setPlans(normalizedPlans);
    } catch (error) {
      console.error('Admin - Exception loading plans:', error);
      // Set empty array instead of showing error
      setPlans([]);
    }
  };

  const loadAiMetrics = async () => {
    try {
      const response = await fetch('/api/admin/ai-metrics');
      const data = await response.json();
      if (!response.ok) return;
      setAiMetrics(data.byProvider || []);
    } catch {
      setAiMetrics([]);
    }
  };

  const loadSyncStatus = async () => {
    setSyncStatusLoading(true);
    setSyncStatusError(null);
    try {
      const response = await fetch(`/api/events/sync/status?t=${Date.now()}`, {
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) {
        setSyncStatusError(data?.error || '상태 정보를 불러오지 못했습니다.');
        return;
      }
      setEventSourceStatus(data.sources || []);
    } catch (error) {
      setEventSourceStatus([]);
      setSyncStatusError((error as Error).message || '상태 조회 오류');
    } finally {
      setSyncStatusLoading(false);
    }
  };

  const handleAddPlan = async () => {
    if (!newPlan.name || !newPlan.price || !newPlan.tier) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    try {
      console.log('Admin - Adding plan:', newPlan);
      
      const priceValue = parseInt(newPlan.price);
      if (isNaN(priceValue) || priceValue < 0) {
        alert('올바른 가격을 입력해주세요.');
        return;
      }

      const features = newPlan.features
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      const { data, error } = await supabase
        .from('plans')
        .insert([
          {
            name: newPlan.name,
            price: priceValue,
            tier: newPlan.tier,
            interval: newPlan.interval,
            is_active: true,
            features: features
          }
        ])
        .select();

      if (error) {
        console.error('Admin - Error adding plan:', error);
        alert('플랜 추가 실패: ' + error.message);
        return;
      }

      console.log('Admin - Plan added successfully:', data);
      alert('플랜이 추가되었습니다.');
      setNewPlan({ name: '', price: '', tier: 'custom', interval: 'month', features: '' });
      await loadPlans();
    } catch (error) {
      console.error('Admin - Exception adding plan:', error);
      alert('플랜 추가 중 오류가 발생했습니다: ' + (error as Error).message);
    }
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;

    try {
      console.log('Admin - Updating plan:', editingPlan);
      
      const { error } = await supabase
        .from('plans')
        .update({
          name: editingPlan.name,
          price: editingPlan.price,
          tier: editingPlan.tier,
          features: editingPlan.features
        })
        .eq('id', editingPlan.id);

      if (error) {
        console.error('Admin - Error updating plan:', error);
        alert('플랜 수정 실패: ' + error.message);
        return;
      }

      console.log('Admin - Plan updated successfully');
      alert('플랜이 수정되었습니다.');
      setEditingPlan(null);
      await loadPlans();
    } catch (error) {
      console.error('Admin - Exception updating plan:', error);
      alert('플랜 수정 중 오류가 발생했습니다: ' + (error as Error).message);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('정말 이 플랜을 삭제하시겠습니까?')) return;

    try {
      console.log('Admin - Deleting plan:', planId);
      
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', planId);

      if (error) {
        console.error('Admin - Error deleting plan:', error);
        alert('플랜 삭제 실패: ' + error.message);
        return;
      }

      console.log('Admin - Plan deleted successfully');
      alert('플랜이 삭제되었습니다.');
      await loadPlans();
    } catch (error) {
      console.error('Admin - Exception deleting plan:', error);
      alert('플랜 삭제 중 오류가 발생했습니다: ' + (error as Error).message);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedUser || !messageContent.trim()) {
      alert('메시지 내용을 입력해주세요.');
      return;
    }

    setSendingMessage(true);
    try {
      // TODO: 실제 메시지 전송 로직 구현 (이메일 또는 알림)
      // 여기서는 콘솔에 로그만 출력
      console.log('Sending message to:', selectedUser.email);
      console.log('Message:', messageContent);
      
      // 실제 구현 시에는 이메일 API나 알림 시스템을 사용
      alert(`메시지가 ${selectedUser.email}에게 전송되었습니다.\n\n(현재는 개발 모드로 실제 전송되지 않습니다)`);
      
      setSelectedUser(null);
      setMessageContent('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('메시지 전송 중 오류가 발생했습니다.');
    } finally {
      setSendingMessage(false);
    }
  };

  const loadSubscriptionHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('subscription_history')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('구독 이력 조회 오류:', error);
        return;
      }

      // 사용자 이메일 정보를 별도로 가져오기
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(h => h.user_id))];
        const { data: users } = await supabase.auth.admin.listUsers();
        
        const userEmailMap = new Map(
          users?.users?.map(u => [u.id, u.email]) || []
        );

        const historyWithEmails = data.map(h => ({
          ...h,
          user_email: userEmailMap.get(h.user_id) || 'Unknown'
        }));

        setSubscriptionHistory(historyWithEmails);
      } else {
        setSubscriptionHistory(data || []);
      }
    } catch (error) {
      console.error('구독 이력 조회 중 오류:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSyncEvents = async () => {
    setSyncingEvents(true);
    setSyncResult(null);

    try {
      console.log('🔄 이벤트 동기화 시작...');
      const response = await fetch('/api/events/sync', { method: 'GET' });

      console.log('📡 응답 상태:', response.status);
      const rawText = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        const snippet = rawText.slice(0, 200);
        const msg = `❌ 실패: ${response.status} - JSON 파싱 실패\n응답: ${snippet}`;
        console.error('❌ 동기화 실패:', msg);
        setSyncResult(msg);
        return;
      }

      console.log('📦 응답 데이터:', data);

      if (response.ok && data?.success) {
        const debugInfo = data.debug || {};
        const results = data.results || {};
        const apiErrors = debugInfo.apiErrors || {};
        const details = `
✅ 이벤트 동기화 완료 (총 ${data.synced}건)

📊 수집 현황
- Tour: ${debugInfo.tourApiCount || 0}건
- Culture: ${debugInfo.cultureApiCount || 0}건
- Seoul: ${debugInfo.seoulApiCount || 0}건
- Gyeonggi: ${debugInfo.gyeonggiApiCount || 0}건

💾 저장 결과
- Tour: 성공 ${results.tour?.synced || 0} / 실패 ${results.tour?.skipped || 0}
- Culture: 성공 ${results.culture?.synced || 0} / 실패 ${results.culture?.skipped || 0}
- Seoul: 성공 ${results.seoul?.synced || 0} / 실패 ${results.seoul?.skipped || 0}
- Gyeonggi: 성공 ${results.gyeonggi?.synced || 0} / 실패 ${results.gyeonggi?.skipped || 0}
`;
        
        console.log('✅ 동기화 성공:', details);
        console.log('🛠 상세 API 오류(개발자용):', apiErrors);
        setSyncResult(details);
        await loadSyncStatus();
      } else {
        const errorMsg = `❌ 실패: ${data?.error || '알 수 없는 오류'}\n상세: ${JSON.stringify(data, null, 2)}`;
        console.error('❌ 동기화 실패:', errorMsg);
        setSyncResult(errorMsg);
      }
    } catch (error) {
      console.error('❌ Event sync error:', error);
      setSyncResult(`❌ 오류: ${(error as Error).message}`);
      await loadSyncStatus();
    } finally {
      setSyncingEvents(false);
    }
  };

  const handleTestPayment = async () => {
    const amount = parseInt(testPaymentAmount);
    if (isNaN(amount) || amount < 100) {
      alert('최소 100원 이상 입력해주세요.');
      return;
    }

    if (paymentMode === 'live' && amount > 1000) {
      if (!confirm('실제 결제 모드에서 1,000원 이상 결제하시겠습니까?\n\n테스트는 소액(100-1,000원)으로 진행하는 것을 권장합니다.')) {
        return;
      }
    }

    setTestPaymentLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('로그인이 필요합니다.');
        return;
      }

      // 테스트용 플랜 생성 또는 선택
      const { data: testPlan } = await supabase
        .from('plans')
        .select('*')
        .eq('tier', 'test')
        .eq('price', amount)
        .single();

      let planId = testPlan?.id;

      if (!testPlan) {
        // 테스트 플랜이 없으면 생성
        const { data: newPlan, error: planError } = await supabase
          .from('plans')
          .insert([{
            name: `테스트 플랜 (${amount}원)`,
            price: amount,
            tier: 'test',
            interval: 'month',
            is_active: true,
            features: ['테스트용 플랜']
          }])
          .select()
          .single();

        if (planError) {
          throw planError;
        }
        planId = newPlan.id;
      }

      // 결제 페이지로 이동
      router.push(`/pricing?test=true&plan=${planId}&amount=${amount}`);
      
    } catch (error) {
      console.error('Error initiating test payment:', error);
      alert('테스트 결제 시작 중 오류가 발생했습니다: ' + (error as Error).message);
    } finally {
      setTestPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">접근 거부</h1>
          <p className="text-gray-600">{error || '관리자 권한이 필요합니다.'}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
          
          {/* Event Sync Button */}
          <button
            onClick={() => void handleSyncEvents()}
            disabled={syncingEvents}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            {syncingEvents ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                동기화 중...
              </>
            ) : (
              <>
                🔄 이벤트 동기화
              </>
            )}
          </button>
        </div>

        {/* Sync Result Message */}
        {syncResult && (
          <div className={`mb-6 p-4 rounded-lg ${
            syncResult.startsWith('✅') || syncResult.includes('📊')
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <pre className="whitespace-pre-wrap font-mono text-sm">{syncResult}</pre>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              개요
            </button>
            <button
              onClick={() => setActiveTab('test-payment')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'test-payment'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              테스트 결제
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              구독 이력 관리
            </button>
            <button
              onClick={() => setActiveTab('revenue')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'revenue'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              세부 수익 관리
            </button>
            <button
              onClick={() => router.push('/admin/ads')}
              className="py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              광고 승인/관리
            </button>
            <button
              onClick={() => router.push('/products')}
              className="py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              구멍가게 상품관리
            </button>
          </nav>
        </div>

        {/* Stats Grid */}
        {adminData && activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">총 회원</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">{adminData.totalUsers}</p>
            </div>
            <button 
              onClick={() => router.push('/admin/members/paid')}
              className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500 hover:bg-green-50 transition-colors text-left cursor-pointer"
            >
              <h3 className="text-sm font-medium text-gray-500">유료회원 수</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">{adminData.paidMembers}</p>
              <p className="text-xs text-green-600 mt-2">클릭하여 명단 보기 →</p>
            </button>
            <button 
              onClick={() => router.push('/admin/members/free')}
              className="bg-white p-6 rounded-lg shadow border-l-4 border-gray-400 hover:bg-gray-50 transition-colors text-left cursor-pointer"
            >
              <h3 className="text-sm font-medium text-gray-500">무료회원 수</h3>
              <p className="text-3xl font-bold text-gray-600 mt-2">{adminData.freeMembers}</p>
              <p className="text-xs text-gray-600 mt-2">클릭하여 명단 보기 →</p>
            </button>
            <button 
              onClick={() => setShowRevenue(!showRevenue)}
              className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500 hover:bg-blue-50 transition-colors text-left cursor-pointer w-full"
            >
              <h3 className="text-sm font-medium text-gray-500">총 매출</h3>
              {showRevenue ? (
                <>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    ₩{adminData.totalRevenue.toLocaleString()}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRevenueDetails(!showRevenueDetails);
                    }}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
                  >
                    {showRevenueDetails ? '세부수익 숨기기 ↑' : '세부수익 확인하기 →'}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-gray-400 mt-2">••••••</p>
                  <p className="text-xs text-gray-600 mt-2">클릭하여 보기 →</p>
                </>
              )}
            </button>
          </div>
        )}

        {/* Revenue Details */}
        {activeTab === 'overview' && showRevenueDetails && adminData && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">세부 수익 관리</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-600">구독 수익</h3>
                  <p className="text-2xl font-bold text-blue-600 mt-2">₩0</p>
                  <p className="text-xs text-gray-500 mt-1">상품 판매대여</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-600">구멍가게 수익</h3>
                  <p className="text-2xl font-bold text-green-600 mt-2">₩0</p>
                  <p className="text-xs text-gray-500 mt-1">이벤트, 광고 등</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-600">기타 수익</h3>
                  <p className="text-2xl font-bold text-purple-600 mt-2">₩0</p>
                  <p className="text-xs text-gray-500 mt-1">이벤트, 광고 등</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">AI 사용량/오류 대시보드 (7일)</h2>
              </div>
              <div className="p-6 space-y-3">
                {aiMetrics.length === 0 ? (
                  <p className="text-sm text-gray-500">아직 집계 데이터가 없습니다.</p>
                ) : (
                  aiMetrics.map((metric) => (
                    <div key={metric.provider} className="rounded-lg border p-3">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-gray-900">
                          {metric.provider === 'google' ? 'Gemini' : metric.provider === 'anthropic' ? 'Claude' : 'OpenAI'}
                        </p>
                        <p className="text-sm text-gray-600">요청 {metric.total}회</p>
                      </div>
                      <p className="text-sm text-green-700">성공률 {metric.successRate}%</p>
                      <p className="text-xs text-gray-500">4xx {metric.error4xx}건 · 5xx {metric.error5xx}건</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">이벤트 동기화 상태</h2>
                <button
                  onClick={loadSyncStatus}
                  disabled={syncStatusLoading}
                  className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
                >
                  {syncStatusLoading ? '새로고침 중...' : '상태 새로고침'}
                </button>
              </div>
              <div className="p-6 space-y-3">
                {syncStatusError && (
                  <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    상태 조회 오류: {syncStatusError}
                  </div>
                )}
                {eventSourceStatus.length === 0 ? (
                  <p className="text-sm text-gray-500">동기화 상태 정보가 없습니다.</p>
                ) : (
                  eventSourceStatus.map((status) => (
                    <div key={status.source} className="rounded-lg border p-3">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-gray-900 uppercase">{status.source}</p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            status.last_status === 'ok'
                              ? 'bg-green-100 text-green-700'
                              : status.last_status === 'error'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {status.last_status === 'ok' ? '정상' : status.last_status === 'error' ? '오류' : '미확인'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        마지막 성공: {status.last_success_at ? new Date(status.last_success_at).toLocaleString('ko-KR') : '-'}
                      </p>
                      <p className="text-xs text-gray-500">
                        최근 수집량: {status.last_count ?? 0}건
                      </p>
                      {status.last_error && (
                        <div className="mt-1">
                          <button
                            onClick={() =>
                              setExpandedSyncSource((prev) => (prev === status.source ? null : status.source))
                            }
                            className="text-xs text-red-600 underline hover:text-red-700"
                          >
                            {expandedSyncSource === status.source ? '오류 접기' : '오류 자세히 보기'}
                          </button>
                          {expandedSyncSource === status.source && (
                            <pre className="text-xs text-red-700 mt-2 whitespace-pre-wrap break-all bg-red-50 border border-red-100 rounded p-2">
                              {status.last_error}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Test Payment Tab */}
        {activeTab === 'test-payment' && (
          <div className="space-y-6">
            {/* Payment Mode Status */}
            <div className={`rounded-lg p-6 ${paymentMode === 'live' ? 'bg-red-50 border-2 border-red-300' : 'bg-blue-50 border-2 border-blue-300'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold mb-2">
                    {paymentMode === 'live' ? '🔴 실제 결제 모드' : '🔵 테스트 모드'}
                  </h2>
                  <p className="text-sm">
                    {paymentMode === 'live' 
                      ? '⚠️ 실제 돈이 결제됩니다! 소액으로 테스트하세요.' 
                      : '테스트 카드로 결제 플로우를 확인할 수 있습니다.'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600 mb-1">환경 변수 설정</p>
                  <code className="text-xs bg-white px-2 py-1 rounded">
                    NEXT_PUBLIC_PORTONE_MODE={paymentMode}
                  </code>
                </div>
              </div>
            </div>

            {/* Test Payment Form */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">결제 테스트</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {paymentMode === 'live' 
                    ? '실제 결제를 테스트합니다. 본인 카드만 사용하세요.' 
                    : '테스트 카드로 결제 플로우를 확인합니다.'}
                </p>
              </div>
              <div className="p-6">
                <div className="max-w-md">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    테스트 금액 (원)
                  </label>
                  <input
                    type="number"
                    value={testPaymentAmount}
                    onChange={(e) => setTestPaymentAmount(e.target.value)}
                    min="100"
                    step="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                    placeholder="100"
                  />
                  
                  {paymentMode === 'live' && parseInt(testPaymentAmount) > 1000 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-yellow-800">
                        ⚠️ 실제 결제 테스트는 100-1,000원으로 진행하는 것을 권장합니다.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleTestPayment}
                    disabled={testPaymentLoading}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                  >
                    {testPaymentLoading ? '처리 중...' : `${testPaymentAmount}원 결제 테스트`}
                  </button>
                </div>

                {/* Test Card Info */}
                {paymentMode === 'test' && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">테스트 카드 정보</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">카드번호:</span>
                        <code className="bg-white px-2 py-1 rounded">5570-1234-5678-9012</code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">유효기간:</span>
                        <code className="bg-white px-2 py-1 rounded">2030-12</code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">CVC:</span>
                        <code className="bg-white px-2 py-1 rounded">123</code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">비밀번호:</span>
                        <code className="bg-white px-2 py-1 rounded">00</code>
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Payment Warning */}
                {paymentMode === 'live' && (
                  <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
                    <h3 className="font-semibold text-red-900 mb-2">⚠️ 실제 결제 주의사항</h3>
                    <ul className="space-y-1 text-sm text-red-800">
                      <li>• 본인 카드만 사용하세요</li>
                      <li>• 소액(100-1,000원)으로 테스트하세요</li>
                      <li>• 테스트 후 즉시 환불하세요</li>
                      <li>• 포트원 콘솔에서 결제 내역 확인 가능</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* How to Switch Mode */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">결제 모드 전환 방법</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">1. 환경 변수 수정</h3>
                    <p className="text-sm text-gray-600 mb-2">.env.local 파일 수정:</p>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono">
                      <div className="mb-2"># 테스트 모드</div>
                      <div className="text-blue-400">NEXT_PUBLIC_PORTONE_MODE=test</div>
                      <div className="text-blue-400">PORTONE_API_KEY=test_xxxxx</div>
                      <div className="mt-3 mb-2"># 실제 결제 모드</div>
                      <div className="text-green-400">NEXT_PUBLIC_PORTONE_MODE=live</div>
                      <div className="text-green-400">PORTONE_API_KEY=live_xxxxx</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">2. 포트원 콘솔에서 API 키 확인</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• 포트원 콘솔 접속: <a href="https://console.portone.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">console.portone.io</a></li>
                      <li>• 상단 탭: API Keys 클릭</li>
                      <li>• 테스트 키와 실제 키(Live) 확인</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">3. 서버 재시작</h3>
                    <p className="text-sm text-gray-600">환경 변수 변경 후 개발 서버를 재시작해야 적용됩니다.</p>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono mt-2">
                      <div>npm run dev</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contract Status Check */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">포트원 계약 상태 확인</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold">1</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">포트원 콘솔 접속</h3>
                      <p className="text-sm text-gray-600">
                        <a href="https://console.portone.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          https://console.portone.io
                        </a> 접속 후 로그인
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold">2</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">PG 설정 확인</h3>
                      <p className="text-sm text-gray-600">좌측 메뉴 → "PG 설정" 또는 "결제 대행사" 클릭</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold">3</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">계약 상태 확인</h3>
                      <p className="text-sm text-gray-600 mb-2">KG이니시스 또는 다른 PG사 계약 상태 확인</p>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-green-600">✓</span>
                          <span className="text-gray-600">"승인됨" 또는 "활성" → 실제 결제 가능</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-yellow-600">⚠</span>
                          <span className="text-gray-600">"대기중" → 승인 대기 (3-5일 소요)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-red-600">✗</span>
                          <span className="text-gray-600">"미계약" → PG사 신청 필요</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold">4</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">연동 모드 확인</h3>
                      <p className="text-sm text-gray-600">채널 관리 → 연동 정보에서 "테스트" 또는 "실연동" 모드 확인</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subscription History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">구독 이력 관리</h2>
              <p className="text-sm text-gray-600 mt-1">회원들의 플랜 변경 이력을 확인하세요</p>
            </div>
            <div className="p-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>이력 관리 기능</strong>: 구독자들이 어떤 플랜을 사용했는지, 언제 변경했는지 추적할 수 있습니다.
                </p>
              </div>
              
              {loadingHistory ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">이력 데이터 로딩 중...</p>
                </div>
              ) : subscriptionHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-lg font-medium mb-2">구독 이력 데이터가 없습니다</p>
                  <p className="text-sm">구독 변경이 발생하면 자동으로 이력이 기록됩니다.</p>
                  <p className="text-xs text-gray-400 mt-2">SQL 파일: db/active/CREATE_SUBSCRIPTION_HISTORY.sql</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사용자</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">플랜</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">가격</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">시작일</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">종료일</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사유</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {subscriptionHistory.map((history) => (
                        <tr key={history.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {history.user_email || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {history.plan_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₩{history.plan_price?.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(history.started_at).toLocaleDateString('ko-KR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {history.ended_at ? new Date(history.ended_at).toLocaleDateString('ko-KR') : '현재'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {history.change_reason === 'initial' && '최초 가입'}
                            {history.change_reason === 'upgrade' && '업그레이드'}
                            {history.change_reason === 'downgrade' && '다운그레이드'}
                            {history.change_reason === 'cancel' && '취소'}
                            {history.change_reason === 'renew' && '갱신'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Revenue Management Tab */}
        {activeTab === 'revenue' && (
          <div className="space-y-6">
            {/* Revenue Summary */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">세부 수익 관리</h2>
                <p className="text-sm text-gray-600 mt-1">수익 출처별 상세 내역 및 구멍가게 재고 관리</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                    <h3 className="text-sm font-medium text-blue-700">구독 수익</h3>
                    <p className="text-3xl font-bold text-blue-900 mt-2">
                      ₩{adminData?.totalRevenue.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">월간/연간 구독료</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                    <h3 className="text-sm font-medium text-green-700">구멍가게 수익</h3>
                    <p className="text-3xl font-bold text-green-900 mt-2">₩0</p>
                    <p className="text-xs text-green-600 mt-1">상품 판매/대여</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
                    <h3 className="text-sm font-medium text-purple-700">기타 수익</h3>
                    <p className="text-3xl font-bold text-purple-900 mt-2">₩0</p>
                    <p className="text-xs text-purple-600 mt-1">이벤트, 광고 등</p>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    💡 <strong>구멍가게 재고 관리</strong>: products 테이블을 생성하면 상품별 재고와 수익을 추적할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Product Inventory */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">구멍가게 재고 현황</h2>
              </div>
              <div className="p-6">
                <div className="text-center py-12 text-gray-500">
                  <div className="text-6xl mb-4">🏪</div>
                  <p className="text-lg font-medium mb-2">구멍가게 상품 데이터</p>
                  <p className="text-sm">데이터베이스에 products 테이블을 생성하면 재고가 표시됩니다.</p>
                  <p className="text-xs text-gray-400 mt-2">SQL 파일: db/active/CREATE_PRODUCTS_TABLE.sql</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plan View */}
        {activeTab === 'overview' && (
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">요금제 View</h2>
            <button
              onClick={() => router.push('/admin/plans/manage')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + 요금제 추가
            </button>
          </div>
          
          <div className="p-6">
            {plans.length === 0 ? (
              <p className="text-center text-gray-500 py-8">등록된 요금제가 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {plans.map((plan) => (
                  <div key={plan.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-semibold">{plan.name}</h4>
                        <p className="text-2xl font-bold text-blue-600">₩{plan.price.toLocaleString()}/월</p>
                        <p className="text-sm text-gray-500">티어: {plan.tier}</p>
                      </div>
                    </div>
                    <ul className="list-disc list-inside text-gray-600 space-y-1 mt-3">
                      {Array.isArray(plan.features) && plan.features.map((feature, idx) => (
                        <li key={idx}>{feature}</li>
                      ))}
                      {!Array.isArray(plan.features) && plan.features && (
                        <li>{plan.features}</li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )}


        {/* Recent Users */}
        {activeTab === 'overview' && adminData && adminData.recentUsers.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">최근 가입 사용자</h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {adminData.recentUsers.map((user, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-900">{user.email}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Paid Members Tab */}
        {activeTab === 'paid-members' && adminData && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">유료회원 명단</h2>
                  <p className="text-sm text-gray-600 mt-1">총 {adminData.paidMembersList.length}명</p>
                </div>
                <button
                  onClick={() => setActiveTab('overview')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  ← 돌아가기
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이메일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      플랜
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      가격
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      가입일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      만료일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adminData.paidMembersList.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.subscription?.plan_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₩{member.subscription?.plan_price.toLocaleString() || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(member.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.subscription?.current_period_end 
                          ? new Date(member.subscription.current_period_end).toLocaleDateString('ko-KR')
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setSelectedUser(member)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          메시지
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {adminData.paidMembersList.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p>유료회원이 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Free Members Tab */}
        {activeTab === 'free-members' && adminData && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">무료회원 명단</h2>
                  <p className="text-sm text-gray-600 mt-1">총 {adminData.freeMembersList.length}명</p>
                </div>
                <button
                  onClick={() => setActiveTab('overview')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  ← 돌아가기
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이메일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      가입일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adminData.freeMembersList.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(member.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setSelectedUser(member)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          메시지
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {adminData.freeMembersList.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p>무료회원이 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Message Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">메시지 보내기</h3>
              <p className="text-sm text-gray-600 mb-4">
                받는 사람: <strong>{selectedUser.email}</strong>
              </p>
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="메시지 내용을 입력하세요..."
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              />
              <div className="flex space-x-3">
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !messageContent.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {sendingMessage ? '전송 중...' : '전송'}
                </button>
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setMessageContent('');
                  }}
                  disabled={sendingMessage}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:cursor-not-allowed"
                >
                  취소
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                💡 현재는 개발 모드입니다. 실제 메시지 전송을 위해서는 이메일 API(예: SendGrid, AWS SES)를 연동해야 합니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
