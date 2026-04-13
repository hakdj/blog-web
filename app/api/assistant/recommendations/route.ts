import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');
    const type = searchParams.get('type');
    const q = (searchParams.get('q') || '').trim();

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    let query = supabase
      .from('events')
      .select('id, title, start_date, end_date, region, event_type, location, link_url')
      .eq('is_active', true)
      .or(`end_date.gte.${today},end_date.is.null`) // Filter for ongoing or future events, or events with no end date
      .order('start_date', { ascending: true })
      .limit(20);

    if (region) {
      query = query.eq('region', region);
    }
    if (type) {
      query = query.eq('event_type', type);
    }
    if (q) {
      query = query.or(`title.ilike.%${q}%,location.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('API Recommendations GET: Error fetching events:', error);
      return NextResponse.json({ error: '추천 이벤트를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 });
    }

    return NextResponse.json({ events: data || [] });
  } catch (error) {
    console.error('API Recommendations GET: Internal server error:', error);
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}
