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
  const [plans, setPlans] = useState<any[]>([]);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '',
    tier: '',
    price: '',
    interval: 'month',
    features: '',
  });
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadAdminData();
    loadPlans();
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
      
      console.log('✅ 관리자 확인 완료');
      console.log('🔵 setLoading(true) 호출');
      setLoading(true);
      console.log('🔵 로딩 상태 설정 완료');
      
      console.log('✅ API 호출 준비 시작');

      // Load admin data
      console.log('🔵 API 호출 시작 - URL:', '/api/admin/data');
      console.log('🔵 사용자 이메일:', user.email);
      
      try {
        const response = await fetch('/api/admin/data', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Email': user.email || '',
          },
          credentials: 'include',
        });
        
        console.log('🔵 fetch 완료, 응답 받음');

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
      } catch (fetchError: any) {
        console.error('❌ Fetch 오류:', fetchError);
        setError(fetchError.message || 'API 호출 실패');
      }
    } catch (err: any) {
      console.error('❌ 전체 오류 발생:', err);
      setError(err.message);
    } finally {
      console.log('🔵 로딩 상태 해제');
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error: any) {
      console.error('플랜 로드 오류:', error);
    }
  };

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const price = parseInt(newPlan.price as string);
      if (isNaN(price) || price < 0) {
        alert('❌ 올바른 가격을 입력하세요.');
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('plans')
        .insert([{
          name: newPlan.name,
          tier: newPlan.tier || 'custom',
          price: price,
          interval: newPlan.interval,
          features: newPlan.features.split(',').map(f => f.trim()).filter(f => f),
        }]);

      if (error) throw error;

      alert('✅ 플랜이 추가되었습니다.');
      setShowAddPlan(false);
      setNewPlan({ name: '', tier: '', price: '', interval: 'month', features: '' });
      loadPlans();
    } catch (error: any) {
      console.error('플랜 추가 오류:', error);
      alert(`❌ 오류: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlan = async (planId: string) => {
    if (!editingPlan) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('plans')
        .update({
          name: editingPlan.name,
          tier: editingPlan.tier || 'custom',
          price: editingPlan.price,
          interval: editingPlan.interval,
          features: typeof editingPlan.features === 'string' 
            ? editingPlan.features.split(',').map((f: string) => f.trim())
            : editingPlan.features,
        })
        .eq('id', planId);

      if (error) throw error;

      alert('✅ 플랜이 수정되었습니다.');
      setEditingPlan(null);
      loadPlans();
    } catch (error: any) {
      alert(`❌ 오류: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async (planId: string, planName: string) => {
    if (!confirm(`"${planName}" 플랜을 삭제하시겠습니까?`)) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      alert('✅ 플랜이 삭제되었습니다.');
      loadPlans();
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

      {/* 플랜 관리 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">플랜 관리</h2>
          <button
            onClick={() => setShowAddPlan(!showAddPlan)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            {showAddPlan ? '취소' : '+ 플랜 추가'}
          </button>
        </div>

        {/* 플랜 추가 폼 */}
        {showAddPlan && (
          <form onSubmit={handleAddPlan} className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">플랜 이름</label>
                <input
                  type="text"
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="예: 베이직"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">플랜 등급 (tier)</label>
                <input
                  type="text"
                  value={newPlan.tier}
                  onChange={(e) => setNewPlan({ ...newPlan, tier: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="예: basic, premium"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">가격 (원)</label>
                <input
                  type="number"
                  value={newPlan.price}
                  onChange={(e) => setNewPlan({ ...newPlan, price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="9900"
                  min="0"
                  required
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">결제 주기</label>
              <select
                value={newPlan.interval}
                onChange={(e) => setNewPlan({ ...newPlan, interval: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="month">월간</option>
                <option value="year">연간</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                기능 (쉼표로 구분)
              </label>
              <textarea
                value={newPlan.features}
                onChange={(e) => setNewPlan({ ...newPlan, features: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="기능1, 기능2, 기능3"
                rows={3}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '추가 중...' : '플랜 추가'}
            </button>
          </form>
        )}

        {/* 플랜 목록 */}
        <div className="space-y-4">
          {plans.map((plan) => (
            <div key={plan.id} className="border border-gray-200 rounded-lg p-4">
              {editingPlan?.id === plan.id ? (
                // 수정 모드
                <div className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">플랜 이름</label>
                      <input
                        type="text"
                        value={editingPlan.name}
                        onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">플랜 등급 (tier)</label>
                      <input
                        type="text"
                        value={editingPlan.tier || ''}
                        onChange={(e) => setEditingPlan({ ...editingPlan, tier: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">가격 (원)</label>
                      <input
                        type="number"
                        value={editingPlan.price}
                        onChange={(e) => setEditingPlan({ ...editingPlan, price: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">결제 주기</label>
                    <select
                      value={editingPlan.interval}
                      onChange={(e) => setEditingPlan({ ...editingPlan, interval: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="month">월간</option>
                      <option value="year">연간</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">기능 (쉼표로 구분)</label>
                    <textarea
                      value={Array.isArray(editingPlan.features) ? editingPlan.features.join(', ') : editingPlan.features}
                      onChange={(e) => setEditingPlan({ ...editingPlan, features: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdatePlan(plan.id)}
                      disabled={loading}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => setEditingPlan(null)}
                      className="flex-1 bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-400"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                // 보기 모드
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                      <p className="text-sm text-gray-600">
                        {plan.price.toLocaleString()}원 / {plan.interval === 'month' ? '월' : '년'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingPlan({ ...plan, features: Array.isArray(plan.features) ? plan.features.join(', ') : plan.features })}
                        className="bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 text-sm font-medium"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan.id, plan.name)}
                        disabled={loading}
                        className="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 text-sm font-medium disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  {plan.features && (
                    <ul className="text-sm text-gray-600 space-y-1">
                      {(Array.isArray(plan.features) ? plan.features : []).map((feature: string, idx: number) => (
                        <li key={idx}>• {feature}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
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
