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
      return NextResponse.json(
        { error: 'AI 키를 마이페이지에 등록해야 라떼 상담을 사용할 수 있습니다.' },
        { status: 403 }
      );
    }

    const systemPrompt = '너는 라떼 친구다. 한국어로 공감하고, 구체적인 행동 제안을 1~2개 해준다.';
    const historyMessages = history
      .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant'))
      .map((m: any) => ({ role: m.role, content: String(m.content || '') }));

    const messages = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...historyMessages,
      { role: 'user', content: message },
    ];

    let reply = '';
    if (provider === 'openai') {
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
      reply = data?.choices?.[0]?.message?.content || '';
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
          messages: [...historyMessages, { role: 'user', content: message }],
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
      reply = data?.content?.map((part: any) => part?.text || '').join('') || '';
    } else {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL}:generateContent?key=${userApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [...historyMessages, { role: 'user', content: message }].map((m) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            })),
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
      reply =
        data?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || '').join('') ||
        '';
    }

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
