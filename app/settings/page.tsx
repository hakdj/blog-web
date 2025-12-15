'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'address' | 'subscription'>('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Profile state
  const [profile, setProfile] = useState({
    nickname: '',
    email: '',
  });

  // Password state
  const [password, setPassword] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  // Address state
  const [address, setAddress] = useState({
    postal_code: '',
    address: '',
    address_detail: '',
    recipient_name: '',
    phone: '',
  });

  // Subscription state
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Set profile with email from user object (most reliable source)
      // 닉네임이 없으면 이메일 앞부분을 기본값으로 사용
      const defaultNickname = profileData?.nickname || user.email?.split('@')[0] || '사용자';
      setProfile({
        nickname: defaultNickname,
        email: user.email || profileData?.email || '',
      });

      if (profileData) {
        setAddress({
          postal_code: profileData.postal_code || '',
          address: profileData.address || '',
          address_detail: profileData.address_detail || '',
          recipient_name: profileData.recipient_name || '',
          phone: profileData.phone || '',
        });
      }

      // Load subscription
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plan:plans(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (subscriptionData) {
        setSubscription(subscriptionData);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    // 닉네임은 수정할 수 없으므로 이 함수는 더 이상 사용되지 않음
    // 프로필 탭에서는 닉네임과 이메일이 모두 읽기 전용으로 표시됨
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (password.new !== password.confirm) {
        setMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' });
        return;
      }

      if (password.new.length < 6) {
        setMessage({ type: 'error', text: '비밀번호는 최소 6자 이상이어야 합니다.' });
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password.new,
      });

      if (error) throw error;

      setMessage({ type: 'success', text: '비밀번호가 성공적으로 변경되었습니다.' });
      setPassword({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '비밀번호 변경에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddressUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage({ type: 'error', text: '로그인이 필요합니다.' });
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          postal_code: address.postal_code.trim(),
          address: address.address.trim(),
          address_detail: address.address_detail.trim() || null,
          recipient_name: address.recipient_name.trim(),
          phone: address.phone.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setMessage({ type: 'success', text: '주소가 성공적으로 업데이트되었습니다.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '주소 업데이트에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionCancel = async () => {
    if (!confirm('정말 구독을 취소하시겠습니까? 취소 후에는 서비스를 이용할 수 없습니다.')) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage({ type: 'error', text: '로그인이 필요합니다.' });
        return;
      }

      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;

      setMessage({ type: 'success', text: '구독이 성공적으로 취소되었습니다.' });
      setSubscription(null);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '구독 취소에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('ko-KR');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">설정</h1>
        <p className="text-gray-600">계정 정보를 관리하고 구독을 관리하세요.</p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: 'profile', label: '개인정보 수정', icon: '👤' },
              { id: 'password', label: '비밀번호', icon: '🔒' },
              { id: 'address', label: '주소', icon: '📍' },
              { id: 'subscription', label: '구독 관리', icon: '💳' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
                  닉네임
                </label>
                <input
                  type="text"
                  id="nickname"
                  value={profile.nickname}
                  disabled
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                  placeholder="닉네임"
                />
                <p className="mt-1 text-xs text-gray-500">닉네임은 변경할 수 없습니다.</p>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  이메일
                </label>
                <input
                  type="email"
                  id="email"
                  value={profile.email}
                  disabled
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">이메일은 변경할 수 없습니다.</p>
              </div>
            </div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordUpdate} className="space-y-6">
              <div>
                <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-2">
                  현재 비밀번호
                </label>
                <input
                  type="password"
                  id="current-password"
                  value={password.current}
                  onChange={(e) => setPassword({ ...password, current: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="현재 비밀번호를 입력하세요"
                />
              </div>

              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
                  새 비밀번호
                </label>
                <input
                  type="password"
                  id="new-password"
                  value={password.new}
                  onChange={(e) => setPassword({ ...password, new: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="새 비밀번호를 입력하세요 (최소 6자)"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
                  새 비밀번호 확인
                </label>
                <input
                  type="password"
                  id="confirm-password"
                  value={password.confirm}
                  onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="새 비밀번호를 다시 입력하세요"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '변경 중...' : '비밀번호 변경'}
              </button>
            </form>
          )}

          {/* Address Tab */}
          {activeTab === 'address' && (
            <form onSubmit={handleAddressUpdate} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-2">
                    우편번호
                  </label>
                  <input
                    type="text"
                    id="postal_code"
                    value={address.postal_code}
                    onChange={(e) => setAddress({ ...address, postal_code: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="우편번호"
                  />
                </div>

                <div>
                  <label htmlFor="recipient_name" className="block text-sm font-medium text-gray-700 mb-2">
                    수령인 이름
                  </label>
                  <input
                    type="text"
                    id="recipient_name"
                    value={address.recipient_name}
                    onChange={(e) => setAddress({ ...address, recipient_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="수령인 이름"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  기본 주소
                </label>
                <input
                  type="text"
                  id="address"
                  value={address.address}
                  onChange={(e) => setAddress({ ...address, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="기본 주소를 입력하세요"
                />
              </div>

              <div>
                <label htmlFor="address_detail" className="block text-sm font-medium text-gray-700 mb-2">
                  상세 주소
                </label>
                <input
                  type="text"
                  id="address_detail"
                  value={address.address_detail}
                  onChange={(e) => setAddress({ ...address, address_detail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="상세 주소를 입력하세요 (선택사항)"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  전화번호
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="전화번호를 입력하세요"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '저장 중...' : '주소 저장'}
              </button>
            </form>
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <div className="space-y-6">
              {subscription ? (
                <>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">현재 구독 정보</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">플랜:</span>
                        <span className="font-medium">{subscription.plan?.name || '알 수 없음'}</span>
                      </div>
                      {subscription.plan?.price !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">가격:</span>
                          <span className="font-medium">
                            {formatPrice(subscription.plan.price)}원
                            {subscription.plan.interval && (
                              <span className="text-gray-500 text-sm ml-1">
                                / {subscription.plan.interval === 'month' ? '월' : '년'}
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">상태:</span>
                        <span className="font-medium text-green-600">활성</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">만료일:</span>
                        <span className="font-medium">
                          {new Date(subscription.current_period_end).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 mb-4">
                      구독을 취소하면 현재 기간이 끝날 때까지 서비스를 이용할 수 있습니다.
                    </p>
                    <button
                      onClick={handleSubscriptionCancel}
                      disabled={loading}
                      className="w-full bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? '처리 중...' : '구독 취소'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">현재 활성화된 구독이 없습니다.</p>
                  <Link
                    href="/pricing"
                    className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    구독하기
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



