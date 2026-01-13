'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const ADMIN_EMAILS = ['hakdjhakdj@naver.com', 'hakdjhakdj@gmail.com'];

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

export default function PaidMembersPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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

      await loadPaidMembers();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPaidMembers = async () => {
    try {
      // Get all users with active subscriptions
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('user_id, plan_id, current_period_end, created_at')
        .eq('status', 'active')
        .gt('current_period_end', new Date().toISOString());

      if (subError) throw subError;

      if (!subscriptions || subscriptions.length === 0) {
        setMembers([]);
        return;
      }

      // Get user details
      const userIds = subscriptions.map(s => s.user_id);
      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

      if (usersError) throw usersError;

      // Get plan details
      const planIds = [...new Set(subscriptions.map(s => s.plan_id))];
      const { data: plans, error: plansError } = await supabase
        .from('plans')
        .select('*')
        .in('id', planIds);

      if (plansError) throw plansError;

      const planMap = new Map(plans?.map(p => [p.id, p]) || []);
      const userMap = new Map(users?.map(u => [u.id, u.email]) || []);

      const paidMembers = subscriptions
        .filter(sub => userMap.has(sub.user_id))
        .map(sub => {
          const plan = planMap.get(sub.plan_id);
          return {
            id: sub.user_id,
            email: userMap.get(sub.user_id) || '',
            created_at: sub.created_at,
            subscription: {
              plan_name: plan?.name || 'Unknown',
              plan_price: plan?.price || 0,
              current_period_end: sub.current_period_end,
            }
          };
        });

      setMembers(paidMembers);
    } catch (error) {
      console.error('Error loading paid members:', error);
    }
  };

  const filteredMembers = members.filter(member =>
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold text-gray-900">유료 회원 명단</h1>
          <p className="text-gray-600 mt-2">총 {members.length}명의 유료 회원</p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <input
            type="text"
            placeholder="이메일로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Members List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredMembers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchQuery ? '검색 결과가 없습니다.' : '유료 회원이 없습니다.'}
            </div>
          ) : (
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
                      구독일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      만료일
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.subscription?.plan_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        ₩{member.subscription?.plan_price.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(member.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.subscription && new Date(member.subscription.current_period_end).toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
