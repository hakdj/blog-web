import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = Number(searchParams.get('days') || 30);
    const from = daysAgo(Number.isFinite(days) ? Math.max(1, days) : 30);

    const { data, error } = await supabase
      .from('assistant_daily_notes')
      .select('note_date, goal, memo')
      .eq('user_id', user.id)
      .gte('note_date', from)
      .order('note_date', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notes: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const note_date = String(body.note_date || '').trim();
    const goal = body.goal ? String(body.goal).trim() : null;
    const memo = body.memo ? String(body.memo).trim() : null;

    if (!note_date) {
      return NextResponse.json({ error: '날짜가 필요합니다.' }, { status: 400 });
    }
    if (!goal && !memo) {
      return NextResponse.json({ error: '목표 또는 메모를 입력해주세요.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('assistant_daily_notes')
      .upsert(
        {
          user_id: user.id,
          note_date,
          goal,
          memo,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,note_date' }
      )
      .select('note_date, goal, memo')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ note: data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
