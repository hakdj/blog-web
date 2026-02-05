import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');
    const type = searchParams.get('type');
    const q = (searchParams.get('q') || '').trim();

    let query = supabase
      .from('events')
      .select('id, title, start_date, end_date, region, event_type, location, link_url')
      .eq('is_active', true)
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ events: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
