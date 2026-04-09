
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DiaryInsight {
  id: string;
  user_id: string;
  analysis_month: string; // YYYY-MM
  analysis_date: string;
  sentiment_score: { positive: number; negative: number; neutral: number; };
  keywords: string[];
  topics: string[];
  summary: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

interface SentimentDataPoint {
  name: string;
  value: number;
  color: string;
}

interface DiaryInsightsClientProps {
  availableMonths: string[];
  error?: string;
}

export default function DiaryInsightsClient({ availableMonths: initialAvailableMonths, error: initialError }: DiaryInsightsClientProps) {
  const router = useRouter();
  const [availableMonths, setAvailableMonths] = useState<string[]>(initialAvailableMonths);
  const [selectedMonth, setSelectedMonth] = useState<string>(initialAvailableMonths[0] || '');
  const [currentInsight, setCurrentInsight] = useState<DiaryInsight | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (selectedMonth) {
      fetchInsight(selectedMonth);
    }
  }, [selectedMonth]);

  const fetchInsight = async (month: string) => {
    setLoadingInsight(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const [year, mon] = month.split('-');
      const response = await fetch(`/api/diary/insights?year=${year}&month=${mon}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '분석 결과를 불러오지 못했습니다.');
      }
      setCurrentInsight(data.insights[0] || null); // 월별 UNIQUE이므로 첫 번째 항목
    } catch (err) {
      setError((err as Error).message);
      setCurrentInsight(null);
    } finally {
      setLoadingInsight(false);
    }
  };

  const handleAnalyzeMonth = async () => {
    setLoadingAnalysis(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch('/api/diary/analyze-monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth.split('-')[1], year: selectedMonth.split('-')[0] }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '일기 분석 요청에 실패했습니다.');
      }
      setSuccessMessage('AI 일기 분석이 완료되었습니다!');
      setCurrentInsight(data.insight); // 새로 생성된 인사이트 표시
      // 새로운 월이 추가되었을 수 있으므로 목록 갱신
      const newMonth = data.insight.analysis_month;
      if (!availableMonths.includes(newMonth)) {
        setAvailableMonths(prev => [...prev, newMonth].sort().reverse());
        setSelectedMonth(newMonth); // 새로 분석된 월로 자동 선택
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const sentimentData: SentimentDataPoint[] = useMemo(() => {
    if (!currentInsight?.sentiment_score) return [];
    const { positive, negative, neutral } = currentInsight.sentiment_score;
    return [
      { name: '긍정', value: positive * 100, color: '#10B981' }, // green-500
      { name: '부정', value: negative * 100, color: '#EF4444' }, // red-500
      { name: '중립', value: neutral * 100, color: '#6B7280' },  // gray-500
    ];
  }, [currentInsight]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-indigo-600 mb-6">AI 일기 분석</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
          {successMessage}
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">분석 요청 및 조회</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="flex-1 w-full sm:w-auto border rounded-lg px-3 py-2"
          >
            {availableMonths.length === 0 && <option value="">분석할 월 선택</option>}
            {availableMonths.map(month => (
              <option key={month} value={month}>{month}월</option>
            ))}
          </select>
          <button
            onClick={handleAnalyzeMonth}
            disabled={loadingAnalysis || !selectedMonth}
            className="w-full sm:w-auto bg-indigo-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingAnalysis ? '분석 중...' : '선택 월 분석 요청'}
          </button>
        </div>
        {availableMonths.length === 0 && !loadingAnalysis && (
          <p className="text-sm text-gray-600">먼저 일기를 작성하고 분석할 월을 선택해주세요.</p>
        )}
        {!currentInsight && !loadingInsight && selectedMonth && !error && (
          <p className="text-sm text-gray-600">선택하신 월에 대한 분석 결과가 없습니다. 분석 요청 버튼을 눌러주세요.</p>
        )}
      </div>

      {loadingInsight && <p className="text-center text-gray-600">분석 결과 불러오는 중...</p>}

      {currentInsight && (
        <div className="bg-white rounded-xl shadow p-6 space-y-8">
          <h2 className="text-xl font-bold text-gray-900">🗓️ {currentInsight.analysis_month}월 분석 결과</h2>
          
          {/* 감정 스코어 차트 */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4">감정 스코어 분포</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sentimentData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 12}} />
                  <YAxis tickFormatter={(val) => `${val}%`} domain={[0, 100]} tick={{fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: '#f3f4f6'}} 
                    contentStyle={{borderRadius: '8px'}}
                    formatter={(value: any) => [`${Number(value).toFixed(1)}%`, '비율']}
                  />
                  <Bar dataKey="value" fill={((entry: SentimentDataPoint) => entry.color) as any} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 주요 키워드 및 토픽 */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4">주요 키워드 & 토픽</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="font-medium text-gray-700 mb-2">감정 키워드:</p>
                <div className="flex flex-wrap gap-2">
                  {currentInsight.keywords.map((keyword, idx) => (
                    <span key={idx} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                      #{keyword}
                    </span>
                  ))}
                  {currentInsight.keywords.length === 0 && <span className="text-sm text-gray-500">없음</span>}
                </div>
              </div>
              <div>
                <p className="font-medium text-gray-700 mb-2">주요 토픽:</p>
                <div className="flex flex-wrap gap-2">
                  {currentInsight.topics.map((topic, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      #{topic}
                    </span>
                  ))}
                  {currentInsight.topics.length === 0 && <span className="text-sm text-gray-500">없음</span>}
                </div>
              </div>
            </div>
          </div>

          {/* 월간 요약 */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4">AI 월간 요약</h3>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="whitespace-pre-wrap text-gray-800">{currentInsight.summary}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
