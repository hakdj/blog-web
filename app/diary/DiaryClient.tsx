'use client';

import { useEffect, useMemo, useState } from 'react';

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
}

const defaultDate = () => new Date().toISOString().slice(0, 10);

export default function DiaryClient() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'mine' | 'public'>('mine');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [entryDate, setEntryDate] = useState(defaultDate());
  const [mood, setMood] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [imageUrls, setImageUrls] = useState<string[]>([]);

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
      (entry.tags || []).join(' ').toLowerCase().includes(q)
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
    setAiKeywords('');
  };

  const loadEntries = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        scope: activeTab,
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
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
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
      await loadEntries();
    } catch (err) {
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
      setError((err as Error).message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
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
    } catch {
      // ignore
    }
    setImageUrls((prev) => prev.filter((u) => u !== url));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">추억의 일기장</h1>
        <p className="text-gray-600">소중한 추억을 기록하고 공유하세요</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={() => setActiveTab('mine')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'mine' ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 border'
          }`}
        >
          내 일기
        </button>
        <button
          onClick={() => setActiveTab('public')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'public' ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 border'
          }`}
        >
          공개 일기
        </button>
        <div className="flex-1 min-w-[220px]">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') loadEntries();
            }}
            placeholder="제목/내용/태그 검색"
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <button
          onClick={loadEntries}
          className="px-4 py-2 rounded-lg border bg-white text-gray-700"
        >
          새로고침
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              {editingId ? '일기 수정' : '새 일기 작성'}
            </h2>
            {editingId && (
              <button
                onClick={resetForm}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                새로 작성
              </button>
            )}
          </div>

          <div className="space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목"
              className="w-full border rounded-lg px-3 py-2"
            />
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
            <input
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              placeholder="기분 (예: 뿌듯함, 설렘)"
              className="w-full border rounded-lg px-3 py-2"
            />
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="태그 (쉼표로 구분)"
              className="w-full border rounded-lg px-3 py-2"
            />
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'private' | 'public')}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="private">비공개</option>
              <option value="public">공개</option>
            </select>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="오늘의 추억을 적어보세요"
              rows={8}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-600">사진 업로드</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleUpload(e.target.files)}
            />
            {imageUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {imageUrls.map((url) => (
                  <div key={url} className="relative">
                    <img src={url} alt="일기 이미지" className="h-20 w-20 rounded object-cover border" />
                    <button
                      onClick={() => removeImage(url)}
                      className="absolute -top-2 -right-2 bg-white border rounded-full px-2 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">AI 작성</h3>
            <textarea
              value={aiKeywords}
              onChange={(e) => setAiKeywords(e.target.value)}
              placeholder="키워드나 상황을 입력하세요 (예: 부산 여행, 친구와 재회)"
              rows={3}
              className="w-full border rounded-lg px-3 py-2"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={aiTone}
                onChange={(e) => setAiTone(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="따뜻하게">따뜻하게</option>
                <option value="차분하게">차분하게</option>
                <option value="유쾌하게">유쾌하게</option>
                <option value="감성적으로">감성적으로</option>
              </select>
              <select
                value={aiLength}
                onChange={(e) => setAiLength(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="짧게">짧게</option>
                <option value="중간">중간</option>
                <option value="길게">길게</option>
              </select>
            </div>
            <button
              onClick={handleAiGenerate}
              disabled={aiLoading}
              className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {aiLoading ? 'AI 작성 중...' : 'AI로 초안 만들기'}
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-pink-600 text-white rounded-lg px-4 py-3 font-bold hover:bg-pink-700 disabled:opacity-50"
          >
            {saving ? '저장 중...' : editingId ? '수정 저장' : '저장하기'}
          </button>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="bg-white rounded-xl shadow p-6 text-center text-gray-600">불러오는 중...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-6 text-center text-gray-600">
              아직 일기가 없습니다.
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div key={entry.id} className="bg-white rounded-xl shadow p-6 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{entry.title}</h3>
                    <p className="text-sm text-gray-500">
                      {entry.entry_date} · {entry.visibility === 'public' ? '공개' : '비공개'}
                    </p>
                  </div>
                  {activeTab === 'mine' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
                {entry.mood && (
                  <div className="text-sm text-gray-600">기분: {entry.mood}</div>
                )}
                <p className="whitespace-pre-wrap text-gray-800">{entry.content}</p>
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {entry.tags.map((tag) => (
                      <span
                        key={`${entry.id}-${tag}`}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                {entry.image_urls && entry.image_urls.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {entry.image_urls.map((url) => (
                      <img key={url} src={url} alt="일기 이미지" className="h-24 w-24 rounded object-cover border" />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
