'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    nickname: '',
    email: ''
  });
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [subscription, setSubscription] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentMethodForm, setShowPaymentMethodForm] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      console.log('Settings - Loading user data...');
      setError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error('Settings - Error getting user:', userError);
        setError('인증 오류: ' + userError.message);
        setInitialLoading(false);
        return;
      }

      if (!user) {
        console.log('Settings - No user found, redirecting to login');
        router.push('/login');
        setInitialLoading(false);
        return;
      }

      console.log('Settings - User loaded:', user.email);
      setUser(user);

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('Settings - Profile data:', profileData);
      console.log('Settings - Profile error:', profileError);

      if (profileData) {
        setProfile({
          nickname: profileData.nickname || '',
          email: user.email || ''
        });
      } else {
        // Profile doesn't exist, set email from user
        setProfile({
          nickname: '',
          email: user.email || ''
        });
      }

      // Load subscription
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      console.log('Settings - Subscription data:', subData);
      console.log('Settings - Subscription error:', subError);

      if (subError) {
        console.error('Settings - Error loading subscription:', subError);
      }

      if (subData) {
        // Load plan details separately
        const { data: planData, error: planError } = await supabase
          .from('plans')
          .select('name, price, interval')
          .eq('id', subData.plan_id)
          .single();

        console.log('Settings - Plan data:', planData);
        
        if (planData) {
          // Combine subscription and plan data
          const combinedData = {
            ...subData,
            plans: planData
          };
          console.log('Settings - Setting subscription state:', combinedData);
          setSubscription(combinedData);
        } else {
          console.log('Settings - Plan not found, setting subscription without plan details');
          setSubscription(subData);
        }
      } else {
        console.log('Settings - No active subscription found');
        setSubscription(null);
      }

      setInitialLoading(false);
    } catch (error) {
      console.error('Settings - Exception loading data:', error);
      setError('데이터 로드 오류: ' + (error as Error).message);
      setInitialLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          nickname: profile.nickname
        });

      if (error) throw error;

      alert('프로필이 업데이트되었습니다.');
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('프로필 업데이트 실패: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (passwords.new !== passwords.confirm) {
        alert('새 비밀번호가 일치하지 않습니다.');
        setLoading(false);
        return;
      }

      if (passwords.new.length < 6) {
        alert('비밀번호는 최소 6자 이상이어야 합니다.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwords.new
      });

      if (error) throw error;

      alert('비밀번호가 변경되었습니다.');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      setError('비밀번호 변경 실패: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoRenew = async () => {
    if (!subscription) return;

    setLoading(true);
    setError(null);

    try {
      const newAutoRenew = !subscription.auto_renew;
      
      const { error } = await supabase
        .from('subscriptions')
        .update({ auto_renew: newAutoRenew })
        .eq('id', subscription.id);

      if (error) throw error;

      alert(newAutoRenew ? '자동 갱신이 활성화되었습니다.' : '자동 갱신이 비활성화되었습니다.');
      await loadUserData();
    } catch (error) {
      console.error('Error toggling auto renew:', error);
      setError('자동 갱신 설정 실패: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePaymentMethod = async () => {
    if (!confirm('결제 수단을 삭제하시겠습니까? 자동 갱신이 비활성화됩니다.')) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/billing/payment-method', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '결제 수단 삭제 실패');
      }

      alert(data.message);
      await loadUserData();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      setError('결제 수단 삭제 실패: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('정말 구독을 취소하시겠습니까?')) return;

    setLoading(true);
    setError(null);

    try {
      if (!subscription) return;

      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'cancelled',
          auto_renew: false,
          cancelled_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (error) throw error;

      alert('구독이 취소되었습니다.');
      await loadUserData();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      setError('구독 취소 실패: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">오류 발생</h1>
          <p className="text-gray-600">{error}</p>
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
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">설정</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Profile Section */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">개인정보 수정</h2>
          </div>
          <form onSubmit={handleProfileUpdate} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이메일
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
              />
              <p className="mt-1 text-sm text-gray-500">이메일은 변경할 수 없습니다.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                닉네임
              </label>
              <input
                type="text"
                value={profile.nickname}
                onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="닉네임을 입력하세요"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '저장 중...' : '프로필 저장'}
            </button>
          </form>
        </div>

        {/* Password Section */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">비밀번호 변경</h2>
          </div>
          <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                새 비밀번호
              </label>
              <input
                type="password"
                value={passwords.new}
                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="새 비밀번호"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                새 비밀번호 확인
              </label>
              <input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="새 비밀번호 확인"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        </div>

        {/* Subscription Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">구독 관리</h2>
          </div>
          <div className="p-6">
            {subscription ? (
              <div className="space-y-6">
                {/* 구독 정보 */}
                <div className="border-b border-gray-200 pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-lg">
                        {subscription.plans?.name || '플랜 정보 없음'}
                      </p>
                      <p className="text-gray-600">
                        ₩{(subscription.plans?.price || 0).toLocaleString()}
                        {subscription.plans?.interval === 'year' ? '/년' : '/월'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      subscription.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {subscription.status === 'active' ? '활성' : subscription.status}
                    </span>
                  </div>
                </div>

                {/* 결제 정보 */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">구독 시작일</span>
                    <span className="text-sm font-medium">
                      {new Date(subscription.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">다음 결제일</span>
                    <span className="text-sm font-medium text-blue-600">
                      {new Date(subscription.current_period_end).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">자동 갱신</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={subscription.auto_renew ?? true}
                        onChange={handleToggleAutoRenew}
                        disabled={loading}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  {subscription.billing_key && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600">결제 수단</span>
                      <span className="text-sm font-medium">
                        등록된 카드 ••••
                      </span>
                    </div>
                  )}
                </div>

                {/* 자동 갱신 안내 */}
                {subscription.auto_renew && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="text-blue-600 mr-3">ℹ️</div>
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">자동 갱신이 활성화되어 있습니다</p>
                        <p className="text-blue-700">
                          다음 결제일에 등록된 결제 수단으로 자동으로 결제됩니다.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 결제 수단 관리 */}
                {subscription.billing_key ? (
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">결제 수단</h3>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="text-2xl mr-3">💳</div>
                        <div>
                          <p className="text-sm font-medium">등록된 카드</p>
                          <p className="text-xs text-gray-500">•••• •••• •••• ••••</p>
                        </div>
                      </div>
                      <button
                        onClick={handleDeletePaymentMethod}
                        disabled={loading}
                        className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-3">
                      <p className="text-sm text-yellow-800">
                        자동 갱신을 위해 결제 수단을 등록해주세요.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowPaymentMethodForm(true)}
                      className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      결제 수단 등록
                    </button>
                  </div>
                )}

                {/* 액션 버튼 */}
                <div className="space-y-2 border-t border-gray-200 pt-4">
                  <button
                    onClick={() => router.push('/pricing')}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    플랜 변경
                  </button>
                  {subscription.status === 'active' && (
                    <button
                      onClick={handleCancelSubscription}
                      disabled={loading}
                      className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? '취소 중...' : '구독 취소'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">활성 구독이 없습니다.</p>
                <button
                  onClick={() => router.push('/pricing')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  구독 플랜 보기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
