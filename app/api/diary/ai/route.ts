import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

function buildFallbackDraft(input: {
  keywords: string;
  mood?: string;
  date?: string;
  tone?: string;
  length?: string;
}) {
  const dateText = input.date ? `${input.date} ` : '';
  const moodText = input.mood ? `기분은 ${input.mood}이었다. ` : '';
  const tone = input.tone || '따뜻하게';
  const length = input.length || '중간';
  const keywords = input.keywords || '소중한 추억';

  return {
    title: `${dateText}추억의 기록`,
    content: [
      `${dateText}${keywords}에 대해 ${tone} 기록해본다.`,
      moodText + `그때의 분위기와 감정이 아직도 생생하다.`,
      `짧게라도 남겨두면 시간이 지나도 이 기억이 더 선명해질 것 같다.`,
      `(${length} 분량으로 정리됨)`,
    ].join('\n\n'),
    mood: input.mood || '',
    tags: keywords.split(',').map((t) => t.trim()).filter(Boolean),
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const keywords = String(body.keywords || '').trim();
    const mood = body.mood ? String(body.mood).trim() : '';
    const date = body.date ? String(body.date).trim() : '';
    const tone = body.tone ? String(body.tone).trim() : '';
    const length = body.length ? String(body.length).trim() : '';

    if (!keywords) {
      return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 });
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('openai_api_key')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: 'AI 키 조회에 실패했습니다.' }, { status: 500 });
    }

    const userApiKey = profileData?.openai_api_key ? String(profileData.openai_api_key).trim() : '';

    if (!userApiKey) {
      const fallback = buildFallbackDraft({ keywords, mood, date, tone, length });
      return NextResponse.json({
        draft: fallback,
        fallback: true,
        message: '개인 OpenAI 키가 등록되지 않아 템플릿으로 작성되었습니다.',
      });
    }

    const prompt = [
      '너는 한국어로 감성적인 일기를 써주는 작가다.',
      `키워드: ${keywords}`,
      date ? `날짜: ${date}` : '',
      mood ? `기분: ${mood}` : '',
      tone ? `톤: ${tone}` : '',
      length ? `길이: ${length}` : '',
      '요구사항:',
      '- 제목 1개와 본문을 작성한다.',
      '- 자연스럽고 따뜻한 문체로 작성한다.',
      '- 출력은 JSON으로만 반환한다.',
      '- JSON 형식: {"title":"", "content":"", "mood":"", "tags":["",""]}',
    ].filter(Boolean).join('\n');

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
        temperature: 0.8,
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
    const message = data?.choices?.[0]?.message?.content || '';

    let draft = null;
    try {
      draft = JSON.parse(message);
    } catch {
      draft = null;
    }

    if (!draft) {
      const fallback = buildFallbackDraft({ keywords, mood, date, tone, length });
      return NextResponse.json({ draft: fallback, fallback: true });
    }

    return NextResponse.json({ draft });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
