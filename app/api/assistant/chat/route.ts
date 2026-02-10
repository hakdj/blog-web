import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const message = String(body.message || '').trim();
    const history = Array.isArray(body.history) ? body.history : [];
    if (!message) {
      return NextResponse.json({ error: '메시지가 비어있습니다.' }, { status: 400 });
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('openai_api_key')
      .eq('id', user.id)
      .maybeSingle();

    const userApiKey = profileData?.openai_api_key ? String(profileData.openai_api_key).trim() : '';
    if (!userApiKey) {
      return NextResponse.json(
        { error: 'OpenAI 키를 마이페이지에 등록해야 라떼 상담을 사용할 수 있습니다.' },
        { status: 403 }
      );
    }

    const messages = [
      {
        role: 'system',
        content: '너는 라떼 친구다. 한국어로 공감하고, 구체적인 행동 제안을 1~2개 해준다.',
      },
      ...history
        .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant'))
        .map((m: any) => ({ role: m.role, content: String(m.content || '') })),
      { role: 'user', content: message },
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userApiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        temperature: 0.7,
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
    const reply = data?.choices?.[0]?.message?.content || '';
    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
