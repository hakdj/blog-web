import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveSubscription } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. 유료 구독자 확인
    const subscription = await getActiveSubscription();
    if (!subscription) {
      return NextResponse.json({ error: '유료 구독자 전용 기능입니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetMonth = searchParams.get('month'); // YYYY-MM 형식
    const targetYear = searchParams.get('year');   // YYYY 형식

    let query = supabase
      .from('diary_insights')
      .select('*')
      .eq('user_id', user.id)
      .order('analysis_date', { ascending: false });

    if (targetMonth && targetYear) {
      const analysisMonth = `${targetYear}-${targetMonth}`;
      query = query.eq('analysis_month', analysisMonth);
    }

    const { data: insights, error } = await query;

    if (error) {
      console.error('Error fetching diary insights:', error);
      return NextResponse.json({ error: '일기 분석 결과를 불러오지 못했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ insights: insights || [] });

  } catch (error) {
    console.error('Error in GET /api/diary/insights:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
