import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserAiCredentials } from '@/lib/ai-credentials';
import { logAiUsage } from '@/lib/ai-usage-log';
import { providerLabel } from '@/lib/ai-provider';
import { getActiveSubscription } from '@/lib/auth';
function buildUpstreamError(provider: 'openai' | 'anthropic' | 'google', status: number, errorText: string) {
  const lower = errorText.toLowerCase();
  const label = providerLabel(provider);
  if (lower.includes('api key not valid') || lower.includes('invalid_api_key') || lower.includes('invalid x-api-key')) {
    return `${label} API 키가 올바르지 않습니다. 마이페이지에서 다시 저장해주세요.`;
  }
  if (lower.includes('not found for api version') || lower.includes('not supported for generatecontent')) {
    return `${label} 모델이 현재 API 버전에서 지원되지 않습니다. 잠시 후 다시 시도해주세요.`;
  }
  return `AI 요청 실패: ${status} - ${errorText.substring(0, 180)}`;
}


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

const FALLBACK_OPENINGS = [
  '오늘은 마음이 차분해지는 날이었다.',
  '오랜만에 여유를 느낀 하루였다.',
  '작은 순간이 크게 남는 하루였다.',
  '기록하고 싶은 장면이 떠오른 하루였다.',
  '평범하지만 따뜻한 하루였다.',
];

const FALLBACK_MIDDLES = [
  '그때의 공기와 분위기가 아직도 기억난다.',
  '짧은 순간이지만 오래 남을 것 같은 느낌이었다.',
  '말로 다 적기 어렵지만 분명히 좋은 기억이다.',
  '오늘을 지나고 나면 더 소중하게 떠오를 것 같다.',
  '평범한 장면들이 모여 특별한 하루가 되었다.',
];

const FALLBACK_CLOSINGS = [
  '다음에도 이런 순간을 잘 기록해두고 싶다.',
  '이 기억을 오래 간직하고 싶다.',
  '오늘을 잘 마무리하고 내일을 기대해본다.',
  '조금 더 나를 돌보는 하루가 되길 바란다.',
  '다음 기록도 차곡차곡 쌓아두고 싶다.',
];

function pick<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)];
}

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
  const opening = pick(FALLBACK_OPENINGS);
  const middle = pick(FALLBACK_MIDDLES);
  const closing = pick(FALLBACK_CLOSINGS);

  return {
    title: `${dateText}추억의 기록`,
    content: [
      `${dateText}${keywords}에 대해 ${tone} 기록해본다.`,
      moodText + opening,
      middle,
      closing,
      `(${length} 분량으로 정리됨)`,
    ].join('\n\n'),
    mood: input.mood || '',
    tags: keywords.split(',').map((t) => t.trim()).filter(Boolean),
  };
}

export async function POST(request: NextRequest) {
  try {
    const startedAt = Date.now();
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await getActiveSubscription();
    if (!subscription) {
      return NextResponse.json({ error: 'AI 기능은 유료 구독자 전용입니다.' }, { status: 403 });
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
      .select('ai_provider, ai_api_key_encrypted, ai_api_key, openai_api_key')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: 'AI 키 조회에 실패했습니다.' }, { status: 500 });
    }

    const { provider, apiKey: userApiKey } = await getUserAiCredentials(supabase, user.id, profileData);

    if (!userApiKey) {
      const fallback = buildFallbackDraft({ keywords, mood, date, tone, length });
      return NextResponse.json({
        draft: fallback,
        fallback: true,
        message: '개인 AI 키가 등록되지 않아 템플릿으로 작성되었습니다.',
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

    const systemPrompt = '한국어로만 답변한다.';
    let message = '';

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
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        await logAiUsage({
          userId: user.id,
          feature: 'diary_draft',
          provider,
          model: OPENAI_MODEL,
          statusCode: response.status,
          latencyMs: Date.now() - startedAt,
          success: false,
          errorMessage: errorText,
        });
        return NextResponse.json(
          { error: buildUpstreamError(provider, response.status, errorText) },
          { status: 500 }
        );
      }

      const data = await response.json();
      message = data?.choices?.[0]?.message?.content || '';
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
          max_tokens: 800,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        await logAiUsage({
          userId: user.id,
          feature: 'diary_draft',
          provider,
          model: ANTHROPIC_MODEL,
          statusCode: response.status,
          latencyMs: Date.now() - startedAt,
          success: false,
          errorMessage: errorText,
        });
        return NextResponse.json(
          { error: buildUpstreamError(provider, response.status, errorText) },
          { status: 500 }
        );
      }

      const data = await response.json();
      message = data?.content?.map((part: any) => part?.text || '').join('') || '';
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
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          message =
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
        await logAiUsage({
          userId: user.id,
          feature: 'diary_draft',
          provider,
          model: GOOGLE_MODEL,
          statusCode: googleStatus,
          latencyMs: Date.now() - startedAt,
          success: false,
          errorMessage: googleErrorText,
        });
        return NextResponse.json(
          { error: buildUpstreamError(provider, googleStatus, googleErrorText) },
          { status: 500 }
        );
      }
    }

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

    await logAiUsage({
      userId: user.id,
      feature: 'diary_draft',
      provider,
      model: provider === 'openai' ? OPENAI_MODEL : provider === 'anthropic' ? ANTHROPIC_MODEL : GOOGLE_MODEL,
      statusCode: 200,
      latencyMs: Date.now() - startedAt,
      success: true,
    });

    return NextResponse.json({ draft });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
