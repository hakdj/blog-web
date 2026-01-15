'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function AdRegistrationPage() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [myAds, setMyAds] = useState<any[]>([]);
  const [showAdForm, setShowAdForm] = useState(true);
  const [editingAd, setEditingAd] = useState<any>(null);
  const [adForm, setAdForm] = useState({
    title: '',
    description: '',
    image_url: '',
    link_url: '',
    end_date: '',
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    loadUserAndSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user && subscription?.status === 'active') {
      loadMyAds();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, subscription]);

  const loadUserAndSubscription = async () => {
    try {
      setError(null);
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        setError('인증 오류: ' + userError.message);
        setInitialLoading(false);
        return;
      }

      if (!user) {
        router.push('/login');
        setInitialLoading(false);
        return;
      }

      setUser(user);

      // 가장 최근 활성 구독 1개만
      const { data: subs, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('current_period_end', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (subError) {
        setSubscription(null);
      } else {
        setSubscription(subs?.[0] ?? null);
      }
    } catch (e) {
      setError('오류가 발생했습니다: ' + (e as Error).message);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadMyAds = async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/ads?user_id=${user.id}`);
      const data = await response.json();
      if (data.ads) setMyAds(data.ads);
    } catch (e) {
      console.error('Error loading ads:', e);
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '광고 생성 실패');

      alert('광고가 등록되었습니다!');
      setShowAdForm(false);
      setAdForm({ title: '', description: '', image_url: '', link_url: '', end_date: '' });
      setImagePreview(null);
      await loadMyAds();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAd) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingAd.id, ...adForm }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '광고 수정 실패');

      alert('광고가 수정되었습니다!');
      setEditingAd(null);
      setAdForm({ title: '', description: '', image_url: '', link_url: '', end_date: '' });
      setImagePreview(null);
      await loadMyAds();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!confirm('이 광고를 삭제하시겠습니까?')) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ads?id=${adId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '광고 삭제 실패');

      alert('광고가 삭제되었습니다.');
      await loadMyAds();
    } catch (e) {
      setError((e as Error).message);
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
      end_date: ad.end_date ? ad.end_date.split('T')[0] : '',
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

    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하여야 합니다.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/ad-image', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '이미지 업로드 실패');

      setAdForm((prev) => ({ ...prev, image_url: data.url }));
    } catch (e) {
      alert((e as Error).message);
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setAdForm((prev) => ({ ...prev, image_url: '' }));
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
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!subscription || subscription.status !== 'active') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">광고 등록</h1>
            <p className="text-gray-600 mb-6">유료 구독자만 광고를 등록할 수 있습니다.</p>
            <button
              onClick={() => router.push('/pricing')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              구독 신청하러 가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">광고 등록</h1>
            <p className="text-sm text-gray-600 mt-1">등록된 광고는 “요즘뭐해?” 페이지에 노출됩니다.</p>
          </div>
          <button
            onClick={() => router.push('/settings')}
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            마이페이지 →
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">새 광고 등록</h2>
            {!showAdForm && (
              <button
                onClick={() => setShowAdForm(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                + 새 광고 등록
              </button>
            )}
          </div>

          {showAdForm && (
            <form
              onSubmit={editingAd ? handleUpdateAd : handleCreateAd}
              className="mb-2 border border-purple-200 rounded-lg p-6 bg-purple-50"
            >
              <h3 className="text-lg font-semibold mb-4">{editingAd ? '광고 수정' : '새 광고 등록'}</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                  <textarea
                    value={adForm.description}
                    onChange={(e) => setAdForm({ ...adForm, description: e.target.value })}
                    placeholder="광고 설명"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">이미지</label>

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
                  <label className="block text-sm font-medium text-gray-700 mb-1">링크 URL *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">종료일 (선택)</label>
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
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">내 광고 목록</h2>
            {!showAdForm && (
              <button
                onClick={() => setShowAdForm(true)}
                className="text-sm text-purple-700 hover:underline"
              >
                새 광고 등록 →
              </button>
            )}
          </div>

          {myAds.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-5xl mb-4">📢</div>
              <p className="text-lg font-medium mb-2">등록된 광고가 없습니다</p>
              <p className="text-sm">새 광고를 등록하여 “요즘뭐해?” 페이지에 노출하세요!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myAds.map((ad) => (
                <div key={ad.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{ad.title}</h3>
                      {ad.description && <p className="text-sm text-gray-600 mb-2">{ad.description}</p>}
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
                      <img src={ad.image_url} alt={ad.title} className="w-24 h-24 object-cover rounded-lg ml-4" />
                    )}
                  </div>

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
                      <div className="text-purple-600 font-medium">클릭률 {((ad.clicks / ad.views) * 100).toFixed(1)}%</div>
                    )}
                    <div className="text-xs text-gray-400">{new Date(ad.created_at).toLocaleDateString('ko-KR')} 등록</div>
                  </div>

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
      </div>
    </div>
  );
}

