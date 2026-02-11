import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';
const GOOGLE_MODEL = process.env.GOOGLE_MODEL || 'gemini-1.5-flash';

type AiProvider = 'openai' | 'anthropic' | 'google';

function resolveProvider(raw?: string | null): AiProvider {
  const value = String(raw || '').toLowerCase();
  if (value === 'anthropic' || value === 'claude') return 'anthropic';
  if (value === 'google' || value === 'gemini') return 'google';
  return 'openai';
}

const FALLBACK_SUMMARY_LINES = [
  '오늘의 감정 흐름은 차분함과 작은 기대가 섞여 있어요.',
  '최근 기록을 보면 꾸준히 나를 돌보려는 마음이 느껴져요.',
  '짧은 기록들이 모여서 하루의 결을 만들어주고 있어요.',
  '최근에는 소소한 기쁨과 안정감을 찾는 모습이 보여요.',
  '기록 속에서 스스로를 응원하려는 마음이 전해져요.',
];

function pick<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)];
}

function fallbackSummary(entries: { title: string; content: string; entry_date: string }[]) {
  if (entries.length === 0) {
    return '아직 작성된 일기가 없습니다. 오늘의 추억을 기록해보세요.';
  }
  const titles = entries.map((e) => e.title).slice(0, 5).join(', ');
  return [
    `최근 일기 ${entries.length}개를 기반으로 요약했어요.`,
    `주요 키워드: ${titles}`,
    pick(FALLBACK_SUMMARY_LINES),
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
      .select('ai_provider, ai_api_key, openai_api_key')
      .eq('id', user.id)
      .maybeSingle();

    const provider = resolveProvider(
      profileData?.ai_provider || (profileData?.openai_api_key ? 'openai' : 'openai')
    );
    const userApiKey = (profileData?.ai_api_key || profileData?.openai_api_key || '')
      .toString()
      .trim();
    if (!userApiKey) {
      return NextResponse.json({
        summary: fallbackSummary(list),
        fallback: true,
        message: '개인 AI 키가 등록되지 않아 템플릿 요약을 사용했습니다.',
      });
    }

    const prompt = [
      '다음 일기들을 읽고 오늘의 감정 흐름과 핵심 키워드를 요약해줘.',
      '요약은 4~6문장, 한국어.',
      list.map((e) => `- [${e.entry_date}] ${e.title}: ${e.content}`).join('\n'),
    ].join('\n');

    const systemPrompt = '한국어로만 답변한다.';
    let summary = '';

    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userApiKey}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
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
      summary = data?.choices?.[0]?.message?.content || '';
    } else if (provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': userApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 512,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }],
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
      summary = data?.content?.map((part: any) => part?.text || '').join('') || '';
    } else {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL}:generateContent?key=${userApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
          { error: `AI 요청 실패: ${response.status} - ${errorText.substring(0, 200)}` },
          { status: 500 }
        );
      }

      const data = await response.json();
      summary =
        data?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || '').join('') ||
        '';
    }

    const finalSummary = summary || fallbackSummary(list);
    return NextResponse.json({ summary: finalSummary });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
