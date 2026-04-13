import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveSubscription } from '@/lib/auth';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { id } = await context.params;
    const { data, error } = await supabase
      .from('diary_entries')
      .select('*, views') // Select views column
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('API Diary GET by ID: Error fetching entry:', error);
      return NextResponse.json({ error: '일기를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: '요청하신 일기를 찾을 수 없습니다.' }, { status: 404 });
    }

    // Increment views for public diaries
    if (data.visibility === 'public') {
      const newViews = (data.views || 0) + 1;
      await supabase
        .from('diary_entries')
        .update({ views: newViews })
        .eq('id', id);
    }

    return NextResponse.json({ entry: data });
  } catch (error) {
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    const { id } = await context.params;
    const body = await request.json();
    const title = body.title ? String(body.title).trim() : undefined;
    const content = body.content ? String(body.content).trim() : undefined;
    const entry_date = body.entry_date ? String(body.entry_date).trim() : undefined;
    const mood = body.mood !== undefined ? String(body.mood || '').trim() : undefined;
    const tags = Array.isArray(body.tags) ? body.tags.map((t: any) => String(t).trim()).filter(Boolean) : undefined;
    const image_urls = Array.isArray(body.image_urls) ? body.image_urls.map((u: any) => String(u).trim()).filter(Boolean) : undefined;
    const visibility = body.visibility === 'public' ? 'public' : body.visibility === 'private' ? 'private' : undefined;

    const updates: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (entry_date !== undefined) updates.entry_date = entry_date;
    if (mood !== undefined) updates.mood = mood || null;
    if (tags !== undefined) updates.tags = tags;
    if (image_urls !== undefined) updates.image_urls = image_urls;
    if (visibility !== undefined) updates.visibility = visibility;

    const { data, error } = await supabase
      .from('diary_entries')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error("API Diary PUT by ID: Error updating entry:", error);
      return NextResponse.json({ error: "일기 수정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
    }

    return NextResponse.json({ entry: data });
  } catch (error) {
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    const { id } = await context.params;
    const { error } = await supabase
      .from('diary_entries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('API Diary DELETE by ID: Error deleting entry:', error);
      return NextResponse.json({ error: '일기 삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}
