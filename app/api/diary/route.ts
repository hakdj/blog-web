import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveSubscription } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'mine';
    const q = (searchParams.get('q') || '').trim();
    const limit = Math.min(Number(searchParams.get('limit') || 50), 100);
    const offset = Math.max(Number(searchParams.get('offset') || 0), 0);

    let query = supabase
      .from('diary_entries')
      .select(`
        *,
        profiles (
          nickname
        )
      `)
      .range(offset, offset + limit - 1);

    if (scope === 'public') {
      query = query
        .eq('visibility', 'public')
        .order('views', { ascending: false, nullsFirst: false }) // Sort by views descending
        .order('created_at', { ascending: false }); // Fallback sort
    } else {
      query = query
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });
    }

    if (q) {
      query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('API Diary GET: Error fetching entries:', error);
      return NextResponse.json({ error: '데이터 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 });
    }

    // 데이터 가공 (profiles 정보에서 닉네임 추출)
    const entries = data?.map((entry: any) => ({
      ...entry,
      author_nickname: entry.profiles?.nickname || '익명'
    })) || [];

    return NextResponse.json({ entries });
  } catch (error) {
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const subscription = await getActiveSubscription();
    if (!subscription) {
      return NextResponse.json({ error: '유료 구독자 전용 기능입니다.' }, { status: 403 });
    }

    const body = await request.json();
    const title = String(body.title || '').trim();
    const content = String(body.content || '').trim();
    const entry_date = String(body.entry_date || '').trim();
    const mood = body.mood ? String(body.mood).trim() : null;
    const tags = Array.isArray(body.tags) ? body.tags.map((t: any) => String(t).trim()).filter(Boolean) : [];
    const image_urls = Array.isArray(body.image_urls) ? body.image_urls.map((u: any) => String(u).trim()).filter(Boolean) : [];
    const visibility = body.visibility === 'public' ? 'public' : 'private';
    const ai_prompt = body.ai_prompt ? String(body.ai_prompt).trim() : null;
    const ai_generated = Boolean(body.ai_generated);

    if (!title || !content) {
      return NextResponse.json({ error: '제목과 내용은 필수입니다.' }, { status: 400 });
    }

    const payload: any = {
      user_id: user.id,
      title,
      content,
      mood,
      tags,
      image_urls,
      visibility,
      ai_prompt,
      ai_generated,
    };
    if (entry_date) payload.entry_date = entry_date;

    const { data, error } = await supabase
      .from('diary_entries')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: '데이터 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 });
    }

    return NextResponse.json({ entry: data });
  } catch (error) {
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}
