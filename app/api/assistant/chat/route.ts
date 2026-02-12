import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';
const GOOGLE_MODEL = process.env.GOOGLE_MODEL || 'gemini-3.0-flash';
const GOOGLE_CANDIDATE_MODELS = Array.from(
  new Set([
    GOOGLE_MODEL,
    'gemini-3.0-flash',
    'gemini-3.0-flash-latest',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest',
  ])
);

type AiProvider = 'openai' | 'anthropic' | 'google';

function resolveProvider(raw?: string | null): AiProvider {
  const value = String(raw || '').toLowerCase();
  if (value === 'anthropic' || value === 'claude') return 'anthropic';
  if (value === 'google' || value === 'gemini') return 'google';
  return 'openai';
}

function formatProviderName(provider: AiProvider) {
  if (provider === 'google') return 'Google Gemini';
  if (provider === 'anthropic') return 'Claude';
  return 'OpenAI';
}

function buildUpstreamError(provider: AiProvider, status: number, errorText: string) {
  const lower = errorText.toLowerCase();
  const providerName = formatProviderName(provider);
  if (
    lower.includes('api key not valid') ||
    lower.includes('invalid_api_key') ||
    lower.includes('invalid x-api-key') ||
    lower.includes('incorrect api key')
  ) {
    return `${providerName} API 키가 올바르지 않습니다. 마이페이지에서 해당 서비스 키를 다시 확인해주세요.`;
  }
  if (lower.includes('permission') || lower.includes('forbidden')) {
    return `${providerName} API 키 권한이 부족합니다. 키 제한/권한 설정을 확인해주세요.`;
  }
  if (lower.includes('not found for api version') || lower.includes('not supported for generatecontent')) {
    return `${providerName} 모델 호환 오류입니다. 마이페이지에서 키를 다시 저장하거나 관리자에게 모델 업데이트를 요청해주세요.`;
  }
  return `AI 요청 실패: ${status} - ${errorText.substring(0, 200)}`;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('ai_provider, ai_api_key, openai_api_key')
      .eq('id', user.id)
      .maybeSingle();

    const provider = resolveProvider(
      profileData?.ai_provider || (profileData?.openai_api_key ? 'openai' : 'openai')
    );
    const hasKey = Boolean((profileData?.ai_api_key || profileData?.openai_api_key || '').toString().trim());
    return NextResponse.json({ provider, hasKey });
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
          { error: buildUpstreamError(provider, response.status, errorText) },
          { status: 400 }
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
          { error: buildUpstreamError(provider, response.status, errorText) },
          { status: 400 }
        );
      }

      const data = await response.json();
      reply = data?.content?.map((part: any) => part?.text || '').join('') || '';
    } else {
      let googleErrorText = '';
      let googleStatus = 500;
      let googleSucceeded = false;

      for (const model of GOOGLE_CANDIDATE_MODELS) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${userApiKey}`,
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

        if (response.ok) {
          const data = await response.json();
          reply =
            data?.candidates?.[0]?.content?.parts
              ?.map((part: any) => part?.text || '')
              .join('') || '';
          googleSucceeded = true;
          break;
        }

        const errorText = await response.text();
        googleStatus = response.status;
        googleErrorText = errorText;
        const lower = errorText.toLowerCase();
        const isModelNotFound =
          response.status === 404 &&
          (lower.includes('not found for api version') ||
            lower.includes('not supported for generatecontent'));
        if (!isModelNotFound) {
          break;
        }
      }

      if (!googleSucceeded) {
        return NextResponse.json(
          { error: buildUpstreamError(provider, googleStatus, googleErrorText) },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
