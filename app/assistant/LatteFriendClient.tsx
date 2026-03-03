'use client';

import { useEffect, useMemo, useState } from 'react';

type Task = {
  id: string;
  title: string;
  note: string | null;
  due_date: string | null;
  is_done: boolean;
  created_at: string;
};

type EventItem = {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  region: string;
  event_type: string;
  location: string | null;
  link_url?: string | null;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatProvider = 'openai' | 'anthropic' | 'google';

const REGIONS = [
  '전국',
  '서울',
  '부산',
  '경기',
  '인천',
  '대구',
  '대전',
  '광주',
  '울산',
  '세종',
  '강원',
  '충북',
  '충남',
  '전북',
  '전남',
  '경북',
  '경남',
  '제주',
];

const MEMORY_PROMPTS = [
  '오늘 가장 기억에 남는 장면은 무엇인가요?',
  '어릴 적 좋아했던 노래 한 곡을 떠올려보세요.',
  '최근에 고마웠던 사람에게 한 줄 메시지를 써보세요.',
  '오늘의 나에게 작은 칭찬을 해준다면?',
  '추억의 장소를 하나 떠올리고 이유를 적어보세요.',
  '어릴 적 즐겨보던 만화나 프로그램을 적어보세요.',
  '요즘 가장 자주 떠오르는 추억은 무엇인가요?',
  '오늘 하루를 색으로 표현한다면 어떤 색일까요?',
  '지금의 나에게 건네고 싶은 한 마디는?',
  '최근에 웃음이 났던 순간을 떠올려보세요.',
];

export default function LatteFriendClient() {
  const [activeTab, setActiveTab] = useState<'plan' | 'recommend' | 'chat' | 'summary' | 'extra'>('plan');
  const [error, setError] = useState('');

  // 일정
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskNote, setTaskNote] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [taskSaving, setTaskSaving] = useState(false);

  // 추천
  const [recRegion, setRecRegion] = useState('전국');
  const [recType, setRecType] = useState('all');
  const [recKeyword, setRecKeyword] = useState('');
  const [recommendations, setRecommendations] = useState<EventItem[]>([]);
  const [recLoading, setRecLoading] = useState(false);

  // 상담
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatLocked, setChatLocked] = useState(false);
  const [chatNotice, setChatNotice] = useState('');
  const [chatProvider, setChatProvider] = useState<ChatProvider>('openai');
  const [chatHasKey, setChatHasKey] = useState(false);

  // 요약
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [prompt, setPrompt] = useState(MEMORY_PROMPTS[0]);
  const [goalDate, setGoalDate] = useState(new Date().toISOString().slice(0, 10));
  const [goalText, setGoalText] = useState('');
  const [memoDate, setMemoDate] = useState(new Date().toISOString().slice(0, 10));
  const [memoText, setMemoText] = useState('');
  const [dailyNotes, setDailyNotes] = useState<{ note_date: string; goal: string | null; memo: string | null }[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (a.is_done !== b.is_done) return a.is_done ? 1 : -1;
      const aDate = a.due_date ? new Date(a.due_date).getTime() : 0;
      const bDate = b.due_date ? new Date(b.due_date).getTime() : 0;
      return aDate - bDate;
    });
  }, [tasks]);

  const loadTasks = async () => {
    try {
      const response = await fetch('/api/assistant/tasks');
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '일정을 불러오지 못했습니다.');
      setTasks(data.tasks || []);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    if (activeTab === 'plan') {
      loadTasks();
    }
    if (activeTab === 'extra') {
      loadDailyNotes();
    }
    if (activeTab === 'chat') {
      loadChatConfig();
    }
  }, [activeTab]);

  const providerLabel = (provider: ChatProvider) => {
    if (provider === 'google') return 'Google Gemini';
    if (provider === 'anthropic') return 'Claude';
    return 'OpenAI';
  };

  const loadChatConfig = async () => {
    try {
      const response = await fetch('/api/assistant/chat');
      const data = await response.json();
      if (!response.ok) return;
      const provider = (data.provider as ChatProvider) || 'openai';
      const hasKey = Boolean(data.hasKey);
      setChatProvider(provider);
      setChatHasKey(hasKey);
      setChatLocked(!hasKey);
      setChatNotice(hasKey ? '' : 'AI 키를 등록하면 라떼 상담을 이용할 수 있어요.');
    } catch {
      // 안내 문구는 기존 상태 유지
    }
  };

  const addTask = async () => {
    if (!taskTitle.trim()) {
      setError('할 일을 입력해주세요.');
      return;
    }
    setTaskSaving(true);
    setError('');
    try {
      const response = await fetch('/api/assistant/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle,
          note: taskNote,
          due_date: taskDate || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '저장 실패');
      setTaskTitle('');
      setTaskNote('');
      setTaskDate('');
      await loadTasks();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTaskSaving(false);
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      const response = await fetch(`/api/assistant/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_done: !task.is_done }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '업데이트 실패');
      await loadTasks();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('일정을 삭제할까요?')) return;
    try {
      const response = await fetch(`/api/assistant/tasks/${taskId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '삭제 실패');
      await loadTasks();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const fetchRecommendations = async () => {
    setRecLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (recRegion !== '전국') params.set('region', recRegion);
      if (recType !== 'all') params.set('type', recType);
      if (recKeyword.trim()) params.set('q', recKeyword.trim());

      const response = await fetch(`/api/assistant/recommendations?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '추천을 불러오지 못했습니다.');
      setRecommendations(data.events || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRecLoading(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const message = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: message }]);
    setChatLoading(true);
    setError('');
    setChatNotice('');
    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: chatMessages.slice(-6),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 403) {
          setChatLocked(true);
          setChatHasKey(false);
          setChatNotice('AI 키를 등록하면 라떼 상담을 이용할 수 있어요.');
          return;
        }
        setChatNotice(data?.error || '상담에 실패했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
      setChatLocked(false);
      setChatHasKey(true);
      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.reply || '' }]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setChatLoading(false);
    }
  };

  const generateSummary = async () => {
    setSummaryLoading(true);
    setError('');
    try {
      const response = await fetch('/api/assistant/summary', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '요약 실패');
      setSummary(data.summary || '');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSummaryLoading(false);
    }
  };

  const changePrompt = () => {
    const next = MEMORY_PROMPTS[Math.floor(Math.random() * MEMORY_PROMPTS.length)];
    setPrompt(next);
  };

  const loadDailyNotes = async () => {
    setDailyLoading(true);
    setError('');
    try {
      const response = await fetch('/api/assistant/daily?days=30');
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '데이터를 불러오지 못했습니다.');
      setDailyNotes(data.notes || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDailyLoading(false);
    }
  };

  const saveGoal = async () => {
    if (!goalText.trim()) {
      setError('목표를 입력해주세요.');
      return;
    }
    setError('');
    try {
      const response = await fetch('/api/assistant/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_date: goalDate,
          goal: goalText.trim(),
          memo: null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '목표 저장 실패');
      await loadDailyNotes();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const saveMemo = async () => {
    if (!memoText.trim()) {
      setError('메모를 입력해주세요.');
      return;
    }
    setError('');
    try {
      const response = await fetch('/api/assistant/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_date: memoDate,
          goal: null,
          memo: memoText.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '메모 저장 실패');
      await loadDailyNotes();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-orange-500 mb-2">라떼 친구</h1>
        <p className="text-gray-600">일정, 취미, 상담, 요약까지 한 번에 관리해요</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setActiveTab('plan')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'plan' ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-700'
          }`}
        >
          일정 관리
        </button>
        <button
          onClick={() => setActiveTab('recommend')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'recommend' ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-700'
          }`}
        >
          취미 추천
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-700'
          }`}
        >
          라떼 상담
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'summary' ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-700'
          }`}
        >
          기록 요약
        </button>
        <button
          onClick={() => setActiveTab('extra')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'extra' ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-700'
          }`}
        >
          기타
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {activeTab === 'plan' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow p-5 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">오늘의 일정</h2>
            <input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="할 일"
              className="w-full border rounded-lg px-3 py-2"
            />
            <textarea
              value={taskNote}
              onChange={(e) => setTaskNote(e.target.value)}
              placeholder="메모"
              rows={3}
              className="w-full border rounded-lg px-3 py-2"
            />
            <input
              type="date"
              value={taskDate}
              onChange={(e) => setTaskDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
            <button
              onClick={addTask}
              disabled={taskSaving}
              className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {taskSaving ? '저장 중...' : '일정 추가'}
            </button>
          </div>
          <div className="lg:col-span-2 space-y-3">
            {sortedTasks.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-6 text-center text-gray-600">
                아직 등록된 일정이 없습니다.
              </div>
            ) : (
              sortedTasks.map((task) => (
                <div key={task.id} className="bg-white rounded-xl shadow p-4 flex items-start justify-between gap-4">
                  <div>
                    <p className={`font-semibold ${task.is_done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {task.title}
                    </p>
                    {task.note && <p className="text-sm text-gray-600 mt-1">{task.note}</p>}
                    {task.due_date && <p className="text-xs text-gray-500 mt-1">마감: {task.due_date}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleTask(task)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {task.is_done ? '복원' : '완료'}
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'recommend' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-5 grid md:grid-cols-4 gap-3">
            <select
              value={recRegion}
              onChange={(e) => setRecRegion(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              {REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
            <select
              value={recType}
              onChange={(e) => setRecType(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="all">전체</option>
              <option value="festival">축제</option>
              <option value="local_feature">지역 특색</option>
            </select>
            <input
              value={recKeyword}
              onChange={(e) => setRecKeyword(e.target.value)}
              placeholder="키워드"
              className="border rounded-lg px-3 py-2"
            />
            <button
              onClick={fetchRecommendations}
              disabled={recLoading}
              className="bg-indigo-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {recLoading ? '검색 중...' : '추천 받기'}
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {recommendations.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-6 text-center text-gray-600">
                아직 추천 결과가 없습니다.
              </div>
            ) : (
              recommendations.map((item) => (
                <a
                  key={item.id}
                  href={item.link_url || '#'}
                  target={item.link_url ? '_blank' : undefined}
                  rel={item.link_url ? 'noreferrer' : undefined}
                  className={`bg-white rounded-xl shadow p-5 space-y-2 block ${
                    item.link_url ? 'hover:shadow-lg transition-shadow' : 'cursor-default'
                  }`}
                  onClick={(e) => {
                    if (!item.link_url) {
                      e.preventDefault();
                    }
                  }}
                >
                  <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-600">
                    {item.region} · {item.event_type}
                  </p>
                  <p className="text-sm text-gray-500">
                    {item.start_date} {item.end_date ? `~ ${item.end_date}` : ''}
                  </p>
                  {item.location && <p className="text-sm text-gray-600">{item.location}</p>}
                  {!item.link_url && (
                    <p className="text-xs text-gray-400">링크 정보 없음</p>
                  )}
                </a>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              chatHasKey
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border border-indigo-100 bg-indigo-50 text-indigo-700'
            }`}
          >
            {chatHasKey ? (
              <span>{providerLabel(chatProvider)} API 키가 등록되었습니다.</span>
            ) : (
              <>
                라떼 상담은 AI 키를 등록한 경우에만 사용할 수 있습니다.
                <span className="ml-2 text-indigo-600">마이페이지에서 키를 등록해 주세요.</span>
              </>
            )}
          </div>
          {chatNotice && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                chatHasKey
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border border-amber-200 bg-amber-50 text-amber-700'
              }`}
            >
              {chatNotice}
            </div>
          )}
          <div className="space-y-3 max-h-[420px] overflow-y-auto">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500">
                고민이나 계획을 적어보세요. 라떼 친구가 도와줄게요.
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div
                  key={`${msg.role}-${idx}`}
                  className={`p-3 rounded-lg ${
                    msg.role === 'user' ? 'bg-indigo-50 text-gray-900' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <p className="text-sm font-semibold mb-1">{msg.role === 'user' ? '나' : '라떼 친구'}</p>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendChat();
              }}
              placeholder={
                chatLocked
                  ? 'AI 키를 등록하면 상담을 시작할 수 있어요'
                  : '오늘의 고민이나 계획을 적어보세요'
              }
              className="flex-1 border rounded-lg px-3 py-2"
              disabled={chatLocked}
            />
            <button
              onClick={sendChat}
              disabled={chatLoading || chatLocked}
              className="bg-indigo-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {chatLoading ? '답변 중...' : '보내기'}
            </button>
          </div>
          {chatLocked && (
            <a
              href="/settings"
              className="inline-flex items-center justify-center rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
            >
              마이페이지에서 AI 키 등록하기
            </a>
          )}
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <p className="text-gray-600">
            최근 작성한 일기를 요약해서 오늘의 핵심 감정을 알려줘요.
          </p>
          <p className="text-sm text-gray-500">
            AI 키가 등록되어 있으면 AI 요약, 없으면 템플릿 요약으로 보여집니다.
          </p>
          <button
            onClick={generateSummary}
            disabled={summaryLoading}
            className="bg-indigo-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {summaryLoading ? '요약 중...' : '요약 생성'}
          </button>
          {summary && (
            <div className="bg-gray-50 border rounded-lg p-4 text-gray-700 whitespace-pre-wrap">
              {summary}
            </div>
          )}
        </div>
      )}

      {activeTab === 'extra' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">오늘의 목표</h3>
            <input
              type="date"
              value={goalDate}
              onChange={(e) => setGoalDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
            <input
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
              placeholder="오늘 꼭 하고 싶은 목표 한 줄"
              className="w-full border rounded-lg px-3 py-2"
            />
            <button
              onClick={saveGoal}
              className="bg-indigo-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-indigo-700"
            >
              목표 저장
            </button>
            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">오늘의 추억 질문</h4>
              <p className="text-gray-600">{prompt}</p>
              <button
                onClick={changePrompt}
                className="bg-gray-100 text-gray-700 rounded-lg px-3 py-2 text-sm hover:bg-gray-200"
              >
                질문 바꾸기
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">추억 캘린더 메모</h3>
            <input
              type="date"
              value={memoDate}
              onChange={(e) => setMemoDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
            <textarea
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              placeholder="그날의 추억 한 줄"
              rows={4}
              className="w-full border rounded-lg px-3 py-2"
            />
            <button
              onClick={saveMemo}
              className="bg-indigo-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-indigo-700"
            >
              메모 저장
            </button>

            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">최근 메모</h4>
              {dailyLoading ? (
                <div className="text-sm text-gray-500">불러오는 중...</div>
              ) : dailyNotes.length === 0 ? (
                <div className="text-sm text-gray-500">아직 메모가 없습니다.</div>
              ) : (
                dailyNotes.map((note) => (
                  <div key={note.note_date} className="border rounded-lg p-3">
                    <p className="text-xs text-gray-500">{note.note_date}</p>
                    {note.goal && <p className="text-sm text-gray-800">목표: {note.goal}</p>}
                    {note.memo && <p className="text-sm text-gray-700">{note.memo}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
