'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
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
      console.log('🔵 설정 페이지 - 사용자 데이터 로드 시작');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('❌ 사용자 로드 오류:', userError);
        setMessage({ type: 'error', text: userError.message || '사용자 인증에 실패했습니다.' });
        setInitialLoading(false);
        return;
      }
      
      if (!user) {
        console.log('❌ 사용자 없음, 로그인 페이지로 이동');
        setInitialLoading(false);
        router.push('/login');
        return;
      }

      console.log('✅ User loaded:', {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      });

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ 프로필 로드 오류:', profileError);
      }

      console.log('✅ Profile data:', profileData);

      // Set profile with email from user object (most reliable source)
      const defaultNickname = profileData?.nickname || user.email?.split('@')[0] || '사용자';
      
      console.log('🔵 프로필 설정:', {
        nickname: defaultNickname,
        email: user.email
      });
      
      setProfile({
        nickname: defaultNickname,
        email: user.email || profileData?.email || '',
      });
      
      console.log('✅ 프로필 state 업데이트 완료');

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
      
      console.log('✅ 설정 페이지 - 모든 데이터 로드 완료');
    } catch (error: any) {
      console.error('❌ 설정 페이지 - 데이터 로드 중 오류:', error);
      setMessage({ type: 'error', text: error.message || '데이터 로드 중 오류가 발생했습니다.' });
    } finally {
      setInitialLoading(false);
    }
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
        password: password.new
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
      if (!user) throw new Error('사용자를 찾을 수 없습니다.');

      const { error } = await supabase
        .from('profiles')
        .update({
          postal_code: address.postal_code,
          address: address.address,
          address_detail: address.address_detail,
          recipient_name: address.recipient_name,
          phone: address.phone,
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

  const handleCancelSubscription = async () => {
    if (!confirm('정말로 구독을 취소하시겠습니까?')) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('사용자를 찾을 수 없습니다.');

      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;

      setMessage({ type: 'success', text: '구독이 취소되었습니다.' });
      loadUserData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '구독 취소에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">설정</h1>
        <p className="text-gray-600">계정 정보를 확인하고 구독을 관리하세요.</p>
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

      {/* 개인정보 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">👤</span>
          개인정보
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              닉네임
            </label>
            <input
              type="text"
              value={profile.nickname}
              disabled
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
            />
            <p className="mt-1 text-xs text-gray-500">닉네임은 변경할 수 없습니다.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이메일
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
            />
            <p className="mt-1 text-xs text-gray-500">이메일은 변경할 수 없습니다.</p>
          </div>
        </div>
      </div>

      {/* 비밀번호 변경 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">🔒</span>
          비밀번호 변경
        </h2>
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              새 비밀번호
            </label>
            <input
              type="password"
              value={password.new}
              onChange={(e) => setPassword({ ...password, new: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="새 비밀번호 (최소 6자)"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              새 비밀번호 확인
            </label>
            <input
              type="password"
              value={password.confirm}
              onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="새 비밀번호 확인"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
      </div>

      {/* 주소 정보 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">📍</span>
          주소 정보
        </h2>
        <form onSubmit={handleAddressUpdate} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                우편번호
              </label>
              <input
                type="text"
                value={address.postal_code}
                onChange={(e) => setAddress({ ...address, postal_code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="우편번호"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                수령인
              </label>
              <input
                type="text"
                value={address.recipient_name}
                onChange={(e) => setAddress({ ...address, recipient_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="수령인 이름"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              주소
            </label>
            <input
              type="text"
              value={address.address}
              onChange={(e) => setAddress({ ...address, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="주소"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              상세 주소
            </label>
            <input
              type="text"
              value={address.address_detail}
              onChange={(e) => setAddress({ ...address, address_detail: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="상세 주소"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              전화번호
            </label>
            <input
              type="tel"
              value={address.phone}
              onChange={(e) => setAddress({ ...address, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="전화번호"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? '저장 중...' : '주소 저장'}
          </button>
        </form>
      </div>

      {/* 구독 관리 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">💳</span>
          구독 관리
        </h2>
        {subscription ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">{subscription.plan?.name}</h3>
              <p className="text-sm text-blue-700 mb-1">
                {subscription.plan?.price?.toLocaleString()}원 / {subscription.plan?.interval === 'month' ? '월' : '년'}
              </p>
              <p className="text-sm text-blue-700">
                다음 결제일: {new Date(subscription.current_period_end).toLocaleDateString('ko-KR')}
              </p>
            </div>
            <button
              onClick={handleCancelSubscription}
              disabled={loading}
              className="w-full bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? '처리 중...' : '구독 취소'}
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">활성 구독이 없습니다.</p>
            <Link
              href="/pricing"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              구독하기
            </Link>
          </div>
        )}
      </div>

      <div className="mt-6">
        <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
          ← 홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
