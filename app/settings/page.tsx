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
  const [cardInfo, setCardInfo] = useState({
    cardNumber: '',
    expiry: '',
    birth: '',
    pwd2digit: ''
  });
  const [myAds, setMyAds] = useState<any[]>([]);
  const [showAdForm, setShowAdForm] = useState(false);
  const [editingAd, setEditingAd] = useState<any>(null);
  const [adForm, setAdForm] = useState({
    title: '',
    description: '',
    image_url: '',
    link_url: '',
    end_date: ''
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (user && subscription?.status === 'active') {
      loadMyAds();
    }
  }, [user, subscription]);

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

      setUser(user);

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        // PGRST116 = no rows returned (정상)
        console.error('Settings - Profile error:', profileError);
      }

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

      if (subError) {
        console.error('Settings - Subscription error:', subError);
        setSubscription(null);
      } else if (subData) {
        // Load plan details separately
        const { data: planData, error: planError } = await supabase
          .from('plans')
          .select('name, price, interval')
          .eq('id', subData.plan_id)
          .single();

        if (planError) {
          console.error('Settings - Plan error:', planError);
          setSubscription(subData);
        } else if (planData) {
          // Combine subscription and plan data
          setSubscription({
            ...subData,
            plans: planData
          });
        } else {
          setSubscription(subData);
        }
      } else {
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

    // 결제 수단이 없으면 자동 갱신 불가
    if (!subscription.billing_key) {
      alert('자동 갱신을 활성화하려면 먼저 결제 수단을 등록해주세요.');
      return;
    }

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

  const handleRegisterPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 카드 번호 검증 (숫자만, 16자리)
      const cardNumberClean = cardInfo.cardNumber.replace(/\s/g, '');
      if (!/^\d{16}$/.test(cardNumberClean)) {
        alert('카드 번호는 16자리 숫자여야 합니다.');
        setLoading(false);
        return;
      }

      // 유효기간 검증 (YYYY-MM)
      if (!/^\d{4}-\d{2}$/.test(cardInfo.expiry)) {
        alert('유효기간은 YYYY-MM 형식이어야 합니다.');
        setLoading(false);
        return;
      }

      // 생년월일 검증 (YYMMDD)
      if (!/^\d{6}$/.test(cardInfo.birth)) {
        alert('생년월일은 6자리 숫자여야 합니다. (YYMMDD)');
        setLoading(false);
        return;
      }

      // 비밀번호 검증 (2자리)
      if (!/^\d{2}$/.test(cardInfo.pwd2digit)) {
        alert('카드 비밀번호 앞 2자리를 입력해주세요.');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/billing/payment-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardNumber: cardNumberClean,
          expiry: cardInfo.expiry,
          birth: cardInfo.birth,
          pwd2digit: cardInfo.pwd2digit,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '결제 수단 등록 실패');
      }

      alert(data.message);
      setShowPaymentMethodForm(false);
      setCardInfo({ cardNumber: '', expiry: '', birth: '', pwd2digit: '' });
      await loadUserData();
    } catch (error) {
      console.error('Error registering payment method:', error);
      setError('결제 수단 등록 실패: ' + (error as Error).message);
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
    // 광고가 있는지 확인
    const hasAds = myAds.length > 0;
    const warningMessage = hasAds 
      ? '정말 구독을 취소하시겠습니까?\n\n⚠️ 경고: 구독을 취소하면 등록된 모든 광고가 자동으로 비활성화됩니다!'
      : '정말 구독을 취소하시겠습니까?';
    
    if (!confirm(warningMessage)) return;

    setLoading(true);
    setError(null);

    try {
      if (!subscription) return;

      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'canceled',  // DB에서는 'canceled' (l 하나)
          auto_renew: false
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

  // 광고 관리 함수들
  const loadMyAds = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/ads?user_id=${user.id}`);
      const data = await response.json();

      if (data.ads) {
        setMyAds(data.ads);
      }
    } catch (error) {
      console.error('Error loading ads:', error);
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adForm)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '광고 생성 실패');
      }

      alert('광고가 등록되었습니다!');
      setShowAdForm(false);
      setAdForm({ title: '', description: '', image_url: '', link_url: '', end_date: '' });
      await loadMyAds();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAd) return;

    setLoading(true);

    try {
      const response = await fetch('/api/ads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingAd.id, ...adForm })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '광고 수정 실패');
      }

      alert('광고가 수정되었습니다!');
      setEditingAd(null);
      setAdForm({ title: '', description: '', image_url: '', link_url: '', end_date: '' });
      await loadMyAds();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!confirm('이 광고를 삭제하시겠습니까?')) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/ads?id=${adId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '광고 삭제 실패');
      }

      alert('광고가 삭제되었습니다.');
      await loadMyAds();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const startEditAd = (ad: any) => {
    setEditingAd(ad);
    setAdForm({
      title: ad.title,
      description: ad.description || '',
      image_url: ad.image_url || '',
      link_url: ad.link_url,
      end_date: ad.end_date ? ad.end_date.split('T')[0] : ''
    });
    setImagePreview(ad.image_url || null);
    setShowAdForm(true);
  };

  const cancelAdForm = () => {
    setShowAdForm(false);
    setEditingAd(null);
    setAdForm({ title: '', description: '', image_url: '', link_url: '', end_date: '' });
    setImagePreview(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 검증 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setUploadingImage(true);

    try {
      // 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // 서버에 업로드
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/ad-image', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '이미지 업로드 실패');
      }

      // 업로드된 이미지 URL을 폼에 설정
      setAdForm({ ...adForm, image_url: data.url });
      console.log('✅ 이미지 업로드 성공:', data.url);

    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      alert((error as Error).message);
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setAdForm({ ...adForm, image_url: '' });
    setImagePreview(null);
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
                    <label className={`relative inline-flex items-center ${!subscription.billing_key ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        checked={subscription.auto_renew ?? false}
                        onChange={handleToggleAutoRenew}
                        disabled={loading || !subscription.billing_key}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:cursor-not-allowed"></div>
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
                {subscription.auto_renew && subscription.billing_key && (
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
                
                {/* 결제 수단 없음 경고 */}
                {!subscription.billing_key && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="text-yellow-600 mr-3">⚠️</div>
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium mb-1">자동 갱신이 활성화되어 있지 않습니다</p>
                        <p className="text-yellow-700">
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
                    
                    {!showPaymentMethodForm ? (
                      <button
                        onClick={() => setShowPaymentMethodForm(true)}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        결제 수단 등록
                      </button>
                    ) : (
                      <form onSubmit={handleRegisterPaymentMethod} className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            카드 번호
                          </label>
                          <input
                            type="text"
                            value={cardInfo.cardNumber}
                            onChange={(e) => setCardInfo({ ...cardInfo, cardNumber: e.target.value })}
                            placeholder="1234 5678 9012 3456"
                            maxLength={19}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              유효기간
                            </label>
                            <input
                              type="text"
                              value={cardInfo.expiry}
                              onChange={(e) => {
                                let value = e.target.value.replace(/\D/g, ''); // 숫자만
                                if (value.length >= 4) {
                                  value = value.slice(0, 4) + '-' + value.slice(4, 6);
                                }
                                setCardInfo({ ...cardInfo, expiry: value });
                              }}
                              placeholder="YYYY-MM"
                              maxLength={7}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              생년월일
                            </label>
                            <input
                              type="text"
                              value={cardInfo.birth}
                              onChange={(e) => setCardInfo({ ...cardInfo, birth: e.target.value })}
                              placeholder="YYMMDD"
                              maxLength={6}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            비밀번호 앞 2자리
                          </label>
                          <input
                            type="password"
                            value={cardInfo.pwd2digit}
                            onChange={(e) => setCardInfo({ ...cardInfo, pwd2digit: e.target.value })}
                            placeholder="••"
                            maxLength={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            {loading ? '등록 중...' : '등록'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowPaymentMethodForm(false);
                              setCardInfo({ cardNumber: '', expiry: '', birth: '', pwd2digit: '' });
                            }}
                            disabled={loading}
                            className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
                          >
                            취소
                          </button>
                        </div>
                      </form>
                    )}
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

        {/* 광고 관리 섹션 (유료 구독자만) */}
        {subscription?.status === 'active' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">내 광고 관리</h2>
              {!showAdForm && (
                <button
                  onClick={() => setShowAdForm(true)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  + 새 광고 등록
                </button>
              )}
            </div>

            {/* 광고 등록/수정 폼 */}
            {showAdForm && (
              <form onSubmit={editingAd ? handleUpdateAd : handleCreateAd} className="mb-6 border border-purple-200 rounded-lg p-6 bg-purple-50">
                <h3 className="text-lg font-semibold mb-4">{editingAd ? '광고 수정' : '새 광고 등록'}</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      제목 *
                    </label>
                    <input
                      type="text"
                      value={adForm.title}
                      onChange={(e) => setAdForm({ ...adForm, title: e.target.value })}
                      placeholder="광고 제목"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      설명
                    </label>
                    <textarea
                      value={adForm.description}
                      onChange={(e) => setAdForm({ ...adForm, description: e.target.value })}
                      placeholder="광고 설명"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      이미지
                    </label>
                    
                    {/* 이미지 미리보기 */}
                    {(imagePreview || adForm.image_url) && (
                      <div className="mb-3 relative inline-block">
                        <img
                          src={imagePreview || adForm.image_url}
                          alt="미리보기"
                          className="w-48 h-48 object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    )}

                    {/* 이미지 업로드 버튼 */}
                    {!adForm.image_url && (
                      <div className="mb-3">
                        <label className="cursor-pointer">
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-500 transition-colors">
                            {uploadingImage ? (
                              <div className="text-gray-500">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                                <p>업로드 중...</p>
                              </div>
                            ) : (
                              <>
                                <div className="text-4xl mb-2">📷</div>
                                <p className="text-sm text-gray-600 mb-1">클릭하여 이미지 업로드</p>
                                <p className="text-xs text-gray-400">JPG, PNG, GIF, WEBP (최대 5MB)</p>
                              </>
                            )}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}

                    {/* 또는 URL 직접 입력 */}
                    <div className="text-center text-xs text-gray-500 mb-2">또는</div>
                    <input
                      type="url"
                      value={adForm.image_url}
                      onChange={(e) => setAdForm({ ...adForm, image_url: e.target.value })}
                      placeholder="이미지 URL 직접 입력 (https://...)"
                      disabled={uploadingImage}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      링크 URL *
                    </label>
                    <input
                      type="url"
                      value={adForm.link_url}
                      onChange={(e) => setAdForm({ ...adForm, link_url: e.target.value })}
                      placeholder="https://example.com"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      종료일 (선택)
                    </label>
                    <input
                      type="date"
                      value={adForm.end_date}
                      onChange={(e) => setAdForm({ ...adForm, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      💡 미설정 시 구독 유지 기간 동안 계속 노출됩니다. 특정 기간만 노출하려면 종료일을 설정하세요.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? '처리 중...' : editingAd ? '수정하기' : '등록하기'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelAdForm}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* 광고 목록 */}
            {myAds.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-5xl mb-4">📢</div>
                <p className="text-lg font-medium mb-2">등록된 광고가 없습니다</p>
                <p className="text-sm">새 광고를 등록하여 "요즘뭐해?" 페이지에 노출하세요!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myAds.map((ad) => (
                  <div key={ad.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{ad.title}</h3>
                        {ad.description && (
                          <p className="text-sm text-gray-600 mb-2">{ad.description}</p>
                        )}
                        <a
                          href={ad.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {ad.link_url}
                        </a>
                      </div>
                      {ad.image_url && (
                        <img
                          src={ad.image_url}
                          alt={ad.title}
                          className="w-24 h-24 object-cover rounded-lg ml-4"
                        />
                      )}
                    </div>

                    {/* 통계 */}
                    <div className="flex items-center gap-6 mb-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <span>👁️</span>
                        <span>{ad.views.toLocaleString()} 조회</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>👆</span>
                        <span>{ad.clicks.toLocaleString()} 클릭</span>
                      </div>
                      {ad.views > 0 && (
                        <div className="text-purple-600 font-medium">
                          클릭률 {((ad.clicks / ad.views) * 100).toFixed(1)}%
                        </div>
                      )}
                      <div className="text-xs text-gray-400">
                        {new Date(ad.created_at).toLocaleDateString('ko-KR')} 등록
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditAd(ad)}
                        className="px-4 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDeleteAd(ad.id)}
                        className="px-4 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
