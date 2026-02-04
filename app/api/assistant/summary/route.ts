import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

function fallbackSummary(entries: { title: string; content: string; entry_date: string }[]) {
  if (entries.length === 0) {
    return '아직 작성된 일기가 없습니다. 오늘의 추억을 기록해보세요.';
  }
  const titles = entries.map((e) => e.title).slice(0, 5).join(', ');
  return [
    `최근 일기 ${entries.length}개를 기반으로 요약했어요.`,
    `주요 키워드: ${titles}`,
    '오늘의 감정 흐름을 한 줄로 정리해보면, 꾸준히 기록하고 싶은 마음이 느껴져요.',
  ].join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: entries, error } = await supabase
      .from('diary_entries')
      .select('title, content, entry_date')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list = entries || [];

    const { data: profileData } = await supabase
      .from('profiles')
      .select('openai_api_key')
      .eq('id', user.id)
      .maybeSingle();

    const userApiKey = profileData?.openai_api_key ? String(profileData.openai_api_key).trim() : '';
    if (!userApiKey) {
      return NextResponse.json({
        summary: fallbackSummary(list),
        fallback: true,
        message: '개인 OpenAI 키가 등록되지 않아 템플릿 요약을 사용했습니다.',
      });
    }

    const prompt = [
      '다음 일기들을 읽고 오늘의 감정 흐름과 핵심 키워드를 요약해줘.',
      '요약은 4~6문장, 한국어.',
      list.map((e) => `- [${e.entry_date}] ${e.title}: ${e.content}`).join('\n'),
    ].join('\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userApiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: '한국어로만 답변한다.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `AI 요청 실패: ${response.status} - ${errorText.substring(0, 200)}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const summary = data?.choices?.[0]?.message?.content || fallbackSummary(list);
    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
