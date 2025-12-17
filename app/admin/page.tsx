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

interface AdminData {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  recentUsers: Array<{
    email: string;
    created_at: string;
  }>;
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newPlan, setNewPlan] = useState({ name: '', price: '', tier: 'custom', interval: 'month', features: '' });
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

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
      await Promise.all([loadAdminData(), loadPlans()]);
      
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
        activeSubscriptions: data.activeSubscriptions || 0,
        totalRevenue: data.totalRevenue || 0,
        recentUsers: data.recentUsers || []
      });
    } catch (error) {
      console.error('Admin - Error loading data:', error);
      // Set default data instead of showing error
      setAdminData({
        totalUsers: 0,
        activeSubscriptions: 0,
        totalRevenue: 0,
        recentUsers: []
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">관리자 대시보드</h1>

        {/* Stats Grid */}
        {adminData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">총 사용자</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">{adminData.totalUsers}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">활성 구독</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">{adminData.activeSubscriptions}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">총 수익</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                ₩{adminData.totalRevenue.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Plan Management */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">플랜 관리</h2>
          </div>
          
          {/* Add New Plan */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold mb-4">새 플랜 추가</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="플랜 이름"
                value={newPlan.name}
                onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="가격"
                value={newPlan.price}
                onChange={(e) => setNewPlan({ ...newPlan, price: e.target.value })}
                min="0"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="티어 (예: basic, premium, custom)"
                value={newPlan.tier}
                onChange={(e) => setNewPlan({ ...newPlan, tier: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={newPlan.interval}
                onChange={(e) => setNewPlan({ ...newPlan, interval: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="month">월간</option>
                <option value="year">연간</option>
              </select>
              <textarea
                placeholder="기능 (한 줄에 하나씩)"
                value={newPlan.features}
                onChange={(e) => setNewPlan({ ...newPlan, features: e.target.value })}
                rows={3}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent md:col-span-2"
              />
            </div>
            <button
              onClick={handleAddPlan}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              플랜 추가
            </button>
          </div>

          {/* Existing Plans */}
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">기존 플랜</h3>
            <div className="space-y-4">
              {plans.map((plan) => (
                <div key={plan.id} className="border border-gray-200 rounded-lg p-4">
                  {editingPlan?.id === plan.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingPlan.name}
                        onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="number"
                        value={editingPlan.price}
                        onChange={(e) => setEditingPlan({ ...editingPlan, price: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        value={editingPlan.tier}
                        onChange={(e) => setEditingPlan({ ...editingPlan, tier: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                      <textarea
                        value={Array.isArray(editingPlan.features) ? editingPlan.features.join('\n') : editingPlan.features || ''}
                        onChange={(e) => setEditingPlan({ ...editingPlan, features: e.target.value.split('\n') })}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={handleUpdatePlan}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => setEditingPlan(null)}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-lg font-semibold">{plan.name}</h4>
                          <p className="text-2xl font-bold text-blue-600">₩{plan.price.toLocaleString()}/월</p>
                          <p className="text-sm text-gray-500">티어: {plan.tier}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingPlan(plan)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDeletePlan(plan.id)}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 font-medium"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        {Array.isArray(plan.features) && plan.features.map((feature, idx) => (
                          <li key={idx}>{feature}</li>
                        ))}
                        {!Array.isArray(plan.features) && plan.features && (
                          <li>{plan.features}</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Users */}
        {adminData && adminData.recentUsers.length > 0 && (
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
      </div>
    </div>
  );
}
