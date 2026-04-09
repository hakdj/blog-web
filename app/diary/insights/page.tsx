import { requireSubscription } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import DiaryInsightsClient from './DiaryInsightsClient';

export default async function DiaryInsightsPage() {
  const { user } = await requireSubscription();
  const supabase = await createClient();

  // 사용자가 분석한 월 목록 가져오기
  const { data: insightsMonths, error } = await supabase
    .from('diary_insights')
    .select('analysis_month')
    .eq('user_id', user.id)
    .order('analysis_month', { ascending: false });

  if (error) {
    console.error('Error fetching insights months:', error);
    // 에러 발생 시 빈 배열로 처리 또는 사용자에게 에러 메시지 표시
    return <DiaryInsightsClient availableMonths={[]} error="분석 월 목록을 불러오지 못했습니다." />;
  }

  const availableMonths = insightsMonths?.map(item => item.analysis_month) || [];

  return <DiaryInsightsClient availableMonths={availableMonths} />;
}
