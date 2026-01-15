'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const ADMIN_EMAILS = ['hakdjhakdj@naver.com', 'hakdjhakdj@gmail.com'];

type AdStatus = 'pending' | 'active' | 'inactive' | 'rejected' | 'all';

interface AdminAd {
  id: string;
  user_id: string;
  user_email?: string | null;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string;
  status: string;
  start_date: string;
  end_date: string | null;
  views: number;
  clicks: number;
  created_at: string;
}

export default function AdminAdsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [statusFilter, setStatusFilter] = useState<AdStatus>('pending');
  const [ads, setAds] = useState<AdminAd[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [editingAd, setEditingAd] = useState<AdminAd | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    image_url: '',
    link_url: '',
    end_date: '',
    status: 'pending' as string,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadAds();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, statusFilter]);

  const checkAdmin = async () => {
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
    } finally {
      setLoading(false);
    }
  };

  const loadAds = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/admin/ads?status=${statusFilter}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '광고 목록 조회 실패');
      setAds(data.ads || []);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const filteredAds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ads;
    return ads.filter((ad) => {
      return (
        (ad.title || '').toLowerCase().includes(q) ||
        (ad.link_url || '').toLowerCase().includes(q) ||
        (ad.user_email || '').toLowerCase().includes(q)
      );
    });
  }, [ads, search]);

  const openEdit = (ad: AdminAd) => {
    setEditingAd(ad);
    setEditForm({
      title: ad.title || '',
      description: ad.description || '',
      image_url: ad.image_url || '',
      link_url: ad.link_url || '',
      end_date: ad.end_date ? ad.end_date.split('T')[0] : '',
      status: ad.status || 'pending',
    });
  };

  const closeEdit = () => {
    setEditingAd(null);
  };

  const patchAd = async (patch: Record<string, any>) => {
    if (!editingAd?.id && !patch.id) return;
    const id = patch.id || editingAd?.id;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/ads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '광고 업데이트 실패');
      await loadAds();
      return data.ad;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (ad: AdminAd) => {
    await patchAd({ id: ad.id, status: 'active' });
  };

  const handleReject = async (ad: AdminAd) => {
    const reason = prompt('반려 사유를 입력하세요 (선택)');
    // 현재 스키마에 reason 컬럼은 없어서 description에 넣지 않고, status만 변경
    await patchAd({ id: ad.id, status: 'rejected' });
    if (reason) {
      // 사유가 필요하면 추후 컬럼 추가 권장
      console.log('Reject reason (not stored):', reason);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingAd) return;
    const endDateIso = editForm.end_date ? new Date(editForm.end_date).toISOString() : null;
    await patchAd({
      title: editForm.title,
      description: editForm.description || null,
      image_url: editForm.image_url || null,
      link_url: editForm.link_url,
      status: editForm.status,
      end_date: endDateIso,
    });
    closeEdit();
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

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
          >
            ← 관리자 대시보드로 돌아가기
          </button>
          <h1 className="text-3xl font-bold text-gray-900">광고 승인/관리</h1>
          <p className="text-gray-600 mt-2">유저가 등록한 광고를 승인/반려하거나 내용을 수정할 수 있습니다.</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2 flex-wrap">
              {([
                { key: 'pending', label: '승인 대기' },
                { key: 'active', label: '승인됨(노출)' },
                { key: 'rejected', label: '반려' },
                { key: 'inactive', label: '비활성' },
                { key: 'all', label: '전체' },
              ] as { key: AdStatus; label: string }[]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setStatusFilter(t.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === t.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="제목/링크/이메일로 검색..."
              className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="p-6">
            {filteredAds.length === 0 ? (
              <p className="text-center text-gray-500 py-12">표시할 광고가 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {filteredAds.map((ad) => (
                  <div key={ad.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                            {ad.status}
                          </span>
                          {ad.user_email && (
                            <span className="text-xs text-gray-500">{ad.user_email}</span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{ad.title}</h3>
                        {ad.description && <p className="text-sm text-gray-600 mt-1">{ad.description}</p>}
                        <a
                          href={ad.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                        >
                          {ad.link_url}
                        </a>
                        <div className="text-xs text-gray-500 mt-2 flex gap-4 flex-wrap">
                          <span>조회 {Number(ad.views || 0).toLocaleString()}</span>
                          <span>클릭 {Number(ad.clicks || 0).toLocaleString()}</span>
                          <span>등록 {new Date(ad.created_at).toLocaleDateString('ko-KR')}</span>
                        </div>
                      </div>

                      {ad.image_url && (
                        <img
                          src={ad.image_url}
                          alt={ad.title}
                          className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                        />
                      )}
                    </div>

                    <div className="flex gap-2 mt-4 flex-wrap">
                      {ad.status !== 'active' && (
                        <button
                          onClick={() => handleApprove(ad)}
                          disabled={saving}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          승인
                        </button>
                      )}
                      {ad.status !== 'rejected' && (
                        <button
                          onClick={() => handleReject(ad)}
                          disabled={saving}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          반려
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(ad)}
                        className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
                      >
                        수정
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edit modal */}
        {editingAd && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow max-w-2xl w-full">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">광고 수정</h2>
                <button onClick={closeEdit} className="text-gray-500 hover:text-gray-700 text-2xl">
                  ✕
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="pending">pending</option>
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="rejected">rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                  <input
                    value={editForm.title}
                    onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이미지 URL</label>
                  <input
                    value={editForm.image_url}
                    onChange={(e) => setEditForm((p) => ({ ...p, image_url: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">링크 URL</label>
                  <input
                    value={editForm.link_url}
                    onChange={(e) => setEditForm((p) => ({ ...p, link_url: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
                  <input
                    type="date"
                    value={editForm.end_date}
                    onChange={(e) => setEditForm((p) => ({ ...p, end_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  저장
                </button>
                <button
                  onClick={closeEdit}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

