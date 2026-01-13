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
  interval: string;
  features: string[];
}

export default function PlansManagePage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [newPlan, setNewPlan] = useState({ 
    name: '', 
    price: '', 
    tier: 'custom', 
    interval: 'month', 
    features: '' 
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeInterval, setActiveInterval] = useState<'month' | 'year'>('month');
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push('/login');
        return;
      }

      const adminCheck = ADMIN_EMAILS.includes(user.email || '');
      setIsAdmin(adminCheck);

      if (!adminCheck) {
        router.push('/');
        return;
      }

      await loadPlans();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
      setPlans([]);
    }
  };

  const handleAddPlan = async () => {
    if (!newPlan.name || !newPlan.price || !newPlan.tier) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    try {
      const priceValue = parseInt(newPlan.price);
      if (isNaN(priceValue) || priceValue < 0) {
        alert('올바른 가격을 입력해주세요.');
        return;
      }

      const features = newPlan.features
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      const { error } = await supabase
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
        ]);

      if (error) throw error;

      alert('플랜이 추가되었습니다!');
      setNewPlan({ name: '', price: '', tier: 'custom', interval: 'month', features: '' });
      setShowAddForm(false);
      await loadPlans();
    } catch (error) {
      console.error('Error adding plan:', error);
      alert('플랜 추가 중 오류가 발생했습니다.');
    }
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;

    try {
      const { error } = await supabase
        .from('plans')
        .update({
          name: editingPlan.name,
          price: editingPlan.price,
          tier: editingPlan.tier,
          features: editingPlan.features
        })
        .eq('id', editingPlan.id);

      if (error) throw error;

      alert('플랜이 수정되었습니다!');
      setEditingPlan(null);
      await loadPlans();
    } catch (error) {
      console.error('Error updating plan:', error);
      alert('플랜 수정 중 오류가 발생했습니다.');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('정말 이 플랜을 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('plans')
        .update({ is_active: false })
        .eq('id', planId);

      if (error) throw error;

      alert('플랜이 삭제되었습니다!');
      await loadPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert('플랜 삭제 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
          >
            ← 관리자 대시보드로 돌아가기
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">요금제 관리</h1>
              <p className="text-gray-600 mt-2">요금제 추가, 수정, 삭제</p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              {showAddForm ? '✕ 취소' : '+ 새 요금제 추가'}
            </button>
          </div>
        </div>

        {/* Add New Plan Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">새 요금제 추가</h2>
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
              className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              추가하기
            </button>
          </div>
        )}

        {/* Plans List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">기존 요금제 목록</h2>
            
            {/* Interval Tabs */}
            <div className="flex gap-4 border-b border-gray-200">
              <button
                onClick={() => setActiveInterval('month')}
                className={`pb-3 px-4 font-medium transition-colors ${
                  activeInterval === 'month'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                월간 요금제
              </button>
              <button
                onClick={() => setActiveInterval('year')}
                className={`pb-3 px-4 font-medium transition-colors ${
                  activeInterval === 'year'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                연간 요금제
              </button>
            </div>
          </div>
          <div className="p-6">
            {plans.filter(plan => plan.interval === activeInterval).length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                {activeInterval === 'month' ? '월간' : '연간'} 요금제가 없습니다.
              </p>
            ) : (
              <div className="space-y-4">
                {plans.filter(plan => plan.interval === activeInterval).map((plan) => (
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
                          value={Array.isArray(editingPlan.features) ? editingPlan.features.join('\n') : ''}
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
                            <p className="text-2xl font-bold text-blue-600">₩{plan.price.toLocaleString()}/{plan.interval === 'month' ? '월' : '년'}</p>
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
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
