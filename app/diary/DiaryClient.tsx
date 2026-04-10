
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

interface DiaryEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  entry_date: string;
  mood: string | null;
  tags: string[] | null;
  image_urls: string[] | null;
  visibility: 'private' | 'public';
  created_at: string;
  author_nickname?: string;
  views?: number;
}

const defaultDate = () => new Date().toISOString().slice(0, 10);

export default function DiaryClient({ isPremium = false }: { isPremium?: boolean }) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'write' | 'mine' | 'public'>('mine');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [entryDate, setEntryDate] = useState(defaultDate());
  const [mood, setMood] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedFileNames, setSelectedFileNames] = useState('');

  const [aiKeywords, setAiKeywords] = useState('');
  const [aiTone, setAiTone] = useState('따뜻하게');
  const [aiLength, setAiLength] = useState('중간');

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter((entry) =>
      entry.title.toLowerCase().includes(q) ||
      entry.content.toLowerCase().includes(q) ||
      (entry.mood || '').toLowerCase().includes(q) ||
      (entry.tags || []).join(' ').toLowerCase().includes(q) ||
      (entry.author_nickname || '').toLowerCase().includes(q)
    );
  }, [entries, searchQuery]);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setEntryDate(defaultDate());
    setMood('');
    setTagsInput('');
    setVisibility('private');
    setImageUrls([]);
    setSelectedFileNames('');
    setAiKeywords('');
  };

  const loadEntries = async () => {
    try {
      setLoading(true);
      setError('');
      // 탭에 따라 scope 설정
      const scope = activeTab === 'public' ? 'public' : 'mine';
      const params = new URLSearchParams({
        scope,
      });
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      }
      const response = await fetch(`/api/diary?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || '일기장을 불러오지 못했습니다.');
      }
      setEntries(data.entries || []);
    } catch (err) {
      console.error('DiaryClient: Error loading entries:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'write') {
        loadEntries();
    }
  }, [activeTab]);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 입력해주세요.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title,
        content,
        entry_date: entryDate,
        mood: mood.trim(),
        tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
        visibility,
        image_urls: imageUrls,
      };

      const response = await fetch(editingId ? `/api/diary/${editingId}` : '/api/diary', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || '저장에 실패했습니다.');
      }
      resetForm();
      setActiveTab('mine'); // 저장 후 내 일기 목록으로 이동
    } catch (err) {
      console.error('DiaryClient: Error submitting entry:', err);
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (entry: DiaryEntry) => {
    setEditingId(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setEntryDate(entry.entry_date || defaultDate());
    setMood(entry.mood || '');
    setTagsInput((entry.tags || []).join(', '));
    setVisibility(entry.visibility);
    setImageUrls(entry.image_urls || []);
    setActiveTab('write'); // 수정 모드 시 작성 탭으로 이동
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm('이 일기를 삭제할까요?')) return;
    try {
      const response = await fetch(`/api/diary/${entryId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || '삭제에 실패했습니다.');
      }
      await loadEntries();
    } catch (err) {
      console.error('DiaryClient: Error deleting entry:', err);
      setError((err as Error).message);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiKeywords.trim()) {
      setError('AI 키워드를 입력해주세요.');
      return;
    }
    setAiLoading(true);
    setError('');
    try {
      const response = await fetch('/api/diary/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: aiKeywords,
          mood,
          date: entryDate,
          tone: aiTone,
          length: aiLength,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'AI 작성에 실패했습니다.');
      }
      const draft = data.draft;
      if (draft) {
        setTitle(draft.title || title);
        setContent(draft.content || content);
        if (draft.mood) setMood(draft.mood);
        if (Array.isArray(draft.tags)) {
          setTagsInput(draft.tags.join(', '));
        }
      }
    } catch (err) {
      console.error('DiaryClient: Error generating AI draft:', err);
      setError((err as Error).message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setSelectedFileNames(Array.from(files).map((f) => f.name).join(', '));
    setError('');
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload/diary-image', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error || '이미지 업로드에 실패했습니다.');
        break;
      }
      uploaded.push(data.url);
    }
    if (uploaded.length > 0) {
      setImageUrls((prev) => [...prev, ...uploaded]);
    }
  };

  const removeImage = async (url: string) => {
    try {
      await fetch(`/api/upload/diary-image?url=${encodeURIComponent(url)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('DiaryClient: Error removing image:', err);
    }
    setImageUrls((prev) => prev.filter((u) => u !== url));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-green-600 mb-2">추억의 일기장</h1>
          <p className="text-gray-600">소중한 추억을 기록하고 친구들과 공유하세요</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner self-start md:self-center">
          <button
            onClick={() => setActiveTab('write')}
            className={`px-6 py-2 rounded-lg font-bold transition-all ${
              activeTab === 'write' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📝 일기 쓰기
          </button>
          <button
            onClick={() => setActiveTab('mine')}
            className={`px-6 py-2 rounded-lg font-bold transition-all ${
              activeTab === 'mine' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🏠 내 일기
          </button>
          <button
            onClick={() => setActiveTab('public')}
            className={`px-6 py-2 rounded-lg font-bold transition-all ${
              activeTab === 'public' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🌏 모두의 일기
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-red-700 shadow-sm">
          <p className="font-bold mb-1">알림</p>
          <p>{error}</p>
        </div>
      )}

      {/* 탭 콘텐츠 영역 */}
      <div className="min-h-[600px]">
        {/* 일기 쓰기 탭 */}
        {activeTab === 'write' && (
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingId ? '✨ 일기 수정하기' : '✨ 오늘의 추억 기록하기'}
              </h2>
              {editingId && (
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm font-medium">
                  취소하고 새로 작성하기 ✕
                </button>
              )}
            </div>

            {!isPremium && (
              <div className="mb-8 rounded-xl bg-pink-50 p-6 border-2 border-pink-100 flex items-center justify-between">
                <div>
                  <p className="text-pink-700 font-bold text-lg mb-1">프리미엄 전용 기능입니다</p>
                  <p className="text-pink-600 text-sm">일기 작성과 AI 일기 코치는 유료 구독자만 사용 가능해요!</p>
                </div>
                <Link href="/pricing" className="bg-pink-600 text-white px-6 py-3 rounded-full font-bold hover:bg-pink-700 transition-colors shadow-md">
                  구독 요금제 보기
                </Link>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">제목</label>
                  <input
                    value={title}
                    disabled={!isPremium}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="제목을 입력하세요"
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-green-400 focus:ring-0 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">날짜</label>
                        <input
                            type="date"
                            value={entryDate}
                            disabled={!isPremium}
                            onChange={(e) => setEntryDate(e.target.value)}
                            className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-green-400 focus:ring-0 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">공개 설정</label>
                        <select
                            value={visibility}
                            disabled={!isPremium}
                            onChange={(e) => setVisibility(e.target.value as 'private' | 'public')}
                            className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-green-400 focus:ring-0 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                        >
                            <option value="private">🔒 나만 보기 (비공개)</option>
                            <option value="public">🌏 모두와 공유 (공개)</option>
                        </select>
                    </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">오늘의 기분 & 태그</label>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                        value={mood}
                        disabled={!isPremium}
                        onChange={(e) => setMood(e.target.value)}
                        placeholder="기분 (예: 설렘)"
                        className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-green-400 focus:ring-0 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                    <input
                        value={tagsInput}
                        disabled={!isPremium}
                        onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="태그 (쉼표 구분)"
                        className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-green-400 focus:ring-0 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">사진 추가</label>
                  <div className="flex items-center gap-3 mb-3">
                    <label
                      htmlFor="diary-image-upload"
                      className={`inline-flex items-center rounded-xl border-2 px-4 py-3 text-sm font-bold transition-all ${
                        isPremium 
                          ? 'border-green-100 bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      📷 사진 파일 선택
                    </label>
                    <span className="text-xs text-gray-400 truncate max-w-[200px]">
                      {selectedFileNames || '업로드할 이미지를 선택하세요'}
                    </span>
                  </div>
                  <input
                    id="diary-image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={!isPremium}
                    className="sr-only"
                    onChange={(e) => handleUpload(e.target.files)}
                  />
                  {imageUrls.length > 0 && (
                    <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                      {imageUrls.map((url) => (
                        <div key={url} className="relative group">
                          <img src={url} alt="일기 이미지" className="h-24 w-24 rounded-lg object-cover border-2 border-white shadow-md" />
                          <button
                            onClick={() => removeImage(url)}
                            disabled={!isPremium}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col h-full">
                <label className="block text-sm font-bold text-gray-700 mb-1">일기 내용</label>
                <textarea
                  value={content}
                  disabled={!isPremium}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="오늘 어떤 특별한 일이 있었나요? 90년대 그 시절처럼 따뜻한 추억을 적어보세요."
                  className="flex-1 w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-green-400 focus:ring-0 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed resize-none"
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 bg-indigo-50 rounded-2xl p-6 border-2 border-indigo-100">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🤖</span>
                    <h3 className="font-bold text-indigo-900">AI로 일기 초안 만들기</h3>
                </div>
                <textarea
                  value={aiKeywords}
                  disabled={!isPremium}
                  onChange={(e) => setAiKeywords(e.target.value)}
                  placeholder="키워드나 상황을 입력하세요 (예: 부산 해운대 여행, 친구와 맛있는 점심)"
                  rows={2}
                  className="w-full border-2 border-white rounded-xl px-4 py-2 mb-3 focus:border-indigo-300 focus:ring-0 text-sm disabled:bg-indigo-50/50"
                />
                <div className="flex gap-2 mb-4">
                    <select value={aiTone} disabled={!isPremium} onChange={(e) => setAiTone(e.target.value)} className="flex-1 border-2 border-white rounded-xl px-3 py-2 text-xs font-bold bg-white disabled:bg-indigo-50/50"><option value="따뜻하게">따뜻하게</option><option value="유쾌하게">유쾌하게</option><option value="감성적으로">감성적으로</option></select>
                    <select value={aiLength} disabled={!isPremium} onChange={(e) => setAiLength(e.target.value)} className="flex-1 border-2 border-white rounded-xl px-3 py-2 text-xs font-bold bg-white disabled:bg-indigo-50/50"><option value="중간">중간 분량</option><option value="짧게">짧게</option><option value="길게">길게</option></select>
                </div>
                <button
                  onClick={handleAiGenerate}
                  disabled={!isPremium || aiLoading}
                  className="w-full bg-indigo-600 text-white rounded-xl px-4 py-3 font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md"
                >
                  {aiLoading ? '✨ AI가 추억을 짓는 중...' : '✨ AI 초안 자동 작성'}
                </button>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!isPremium || saving}
                className="md:w-1/3 bg-green-600 text-white rounded-2xl px-6 py-8 font-black text-xl hover:bg-green-700 disabled:opacity-50 transition-all shadow-xl hover:shadow-2xl flex flex-col items-center justify-center gap-2"
              >
                <span>💾</span>
                <span>{editingId ? '수정 내용 저장' : '일기장 저장하기'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 내 일기 & 모두의 일기 목록 탭 */}
        {(activeTab === 'mine' || activeTab === 'public') && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="relative w-full md:w-1/2">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') loadEntries(); }}
                        placeholder={activeTab === 'mine' ? "내 일기 제목, 내용, 태그로 검색..." : "모두의 일기 제목, 작성자, 태그로 검색..."}
                        className="w-full border-2 border-gray-100 rounded-full pl-10 pr-4 py-3 focus:border-green-400 focus:ring-0 transition-all"
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button onClick={loadEntries} className="flex-1 md:flex-none px-6 py-3 bg-white border-2 border-gray-100 rounded-full text-gray-600 font-bold hover:bg-gray-50 transition-all">🔄 새로고침</button>
                    <button onClick={() => setActiveTab('write')} className="flex-1 md:flex-none px-6 py-3 bg-green-600 text-white rounded-full font-bold hover:bg-green-700 transition-all shadow-lg">📝 새 일기 쓰기</button>
                </div>
            </div>

            {loading ? (
              <div className="py-20 text-center">
                <div className="animate-spin text-4xl mb-4">⏳</div>
                <p className="text-gray-500 font-medium">추억을 불러오는 중입니다...</p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="py-20 bg-white rounded-3xl border-4 border-dashed border-gray-100 text-center">
                <div className="text-6xl mb-6">🏜️</div>
                <p className="text-xl text-gray-400 font-bold mb-2">
                    {searchQuery ? '검색 결과가 없습니다.' : activeTab === 'mine' ? '아직 작성한 일기가 없습니다.' : '공개된 일기가 아직 없습니다.'}
                </p>
                <p className="text-gray-400">새로운 추억을 기록해 보는 건 어떨까요?</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredEntries.map((entry) => (
                  <div key={entry.id} className="group bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-green-200 flex flex-col overflow-hidden">
                    {/* 카드 이미지 */}
                    {entry.image_urls && entry.image_urls.length > 0 ? (
                        <div className="relative h-48 overflow-hidden">
                            <img src={entry.image_urls[0]} alt="일기 이미지" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            {entry.image_urls.length > 1 && (
                                <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-md">+{entry.image_urls.length - 1}장</span>
                            )}
                        </div>
                    ) : (
                        <div className="h-4 sm:h-6 bg-gradient-to-r from-green-50 to-indigo-50" />
                    )}

                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">📅 {entry.entry_date}</span>
                            {activeTab === 'mine' && (
                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${entry.visibility === 'public' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {entry.visibility === 'public' ? '🌏 공개' : '🔒 비공개'}
                                </span>
                            )}
                        </div>
                        {activeTab === 'mine' && (
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(entry)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">✏️</button>
                            <button onClick={() => handleDelete(entry.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">🗑️</button>
                          </div>
                        )}
                      </div>

                      <h3 className="text-xl font-black text-gray-900 mb-2 line-clamp-1">{entry.title}</h3>
                      
                      {/* 작성자 표시 (모두의 일기 탭) */}
                      {activeTab === 'public' && (
                          <div className="flex items-center gap-2 mb-3">
                              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-[10px]">👤</div>
                              <span className="text-sm font-bold text-gray-600">{entry.author_nickname} 님의 기록</span>
                          </div>
                      )}

                      {entry.mood && (
                        <div className="inline-flex items-center gap-1 text-sm text-pink-600 font-bold mb-3">
                            <span>🎭 기분:</span>
                            <span className="bg-pink-50 px-2 py-0.5 rounded-md">{entry.mood}</span>
                        </div>
                      )}

                      <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3 flex-1">{entry.content}</p>
                      
                      <div className="flex flex-wrap gap-2 mt-auto">
                        {entry.tags && entry.tags.map((tag) => (
                          <span key={`${entry.id}-${tag}`} className="text-[11px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg font-bold">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-[10px] text-gray-400">
                          <span>조회수 {entry.views || 0}</span>
                          <Link href={`/diary/${entry.id}`} className="text-green-600 font-bold text-sm hover:underline">상세보기 →</Link>
                      </div>
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
