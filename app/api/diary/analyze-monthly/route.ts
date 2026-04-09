import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveSubscription } from '@/lib/auth';
import { getUserAiCredentials } from '@/lib/ai-credentials';
import { logAiUsage } from '@/lib/ai-usage-log';
import { providerLabel } from '@/lib/ai-provider';

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';
const GOOGLE_MODEL = process.env.GOOGLE_MODEL || 'gemini-1.5-flash'; // For cost efficiency

// Error building function (from lib/ai-credentials.ts or similar)
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

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn('AI Diary Analysis: Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. 유료 구독자 확인
    const subscription = await getActiveSubscription();
    if (!subscription) {
      console.warn(`AI Diary Analysis: User ${user.id} is not a premium subscriber.`);
      return NextResponse.json({ error: '유료 구독자 전용 기능입니다.' }, { status: 403 });
    }

    // 2. 사용자 AI 키 확인
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('ai_provider, ai_api_key_encrypted, ai_api_key, openai_api_key')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('AI Diary Analysis: Error fetching user profile for AI key:', profileError);
      return NextResponse.json({ error: 'AI 키 조회에 실패했습니다.' }, { status: 500 });
    }

    const { provider, apiKey: userApiKey } = await getUserAiCredentials(supabase, user.id, profileData);
    if (!userApiKey) {
      console.warn(`AI Diary Analysis: User ${user.id} has no AI key registered.`);
      return NextResponse.json(
        { error: 'AI 일기 분석을 위해 마이페이지에 개인 AI 키를 등록해주세요.' },
        { status: 403 }
      );
    }

    // 요청 바디에서 분석할 월(month) 정보 가져오기 (선택 사항, 기본은 지난달)
    const body = await request.json();
    const targetMonth = String(body.month || '').trim(); // YYYY-MM 형식
    const targetYear = String(body.year || '').trim(); // YYYY 형식

    let analysisMonth: string;
    let startDate: Date;
    let endDate: Date;

    if (targetMonth && targetYear) {
      analysisMonth = `${targetYear}-${targetMonth}`;
      startDate = new Date(Number(targetYear), Number(targetMonth) - 1, 1);
      endDate = new Date(Number(targetYear), Number(targetMonth), 0); // last day of month
    } else {
      // 기본값: 지난달 분석
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      analysisMonth = lastMonth.toISOString().slice(0, 7); // YYYY-MM
      startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0); // Last day of last month
    }

    console.log(`AI Diary Analysis: User ${user.id} requesting analysis for ${analysisMonth}`);
    
    // 이미 해당 월에 대한 분석 결과가 있는지 확인
    const { data: existingInsight } = await supabase
      .from('diary_insights')
      .select('id')
      .eq('user_id', user.id)
      .eq('analysis_month', analysisMonth)
      .maybeSingle();

    if (existingInsight) {
      console.log(`AI Diary Analysis: Analysis for ${analysisMonth} already exists for user ${user.id}.`);
      return NextResponse.json(
        { error: `${analysisMonth}에 대한 일기 분석 결과가 이미 존재합니다.` },
        { status: 409 }
      );
    }

    // 3. 사용자 일기 내용 Fetch (분석 대상 월의 모든 일기)
    const { data: diaryEntries, error: diaryError } = await supabase
      .from('diary_entries')
      .select('title, content, mood, tags')
      .eq('user_id', user.id)
      .gte('entry_date', startDate.toISOString().split('T')[0])
      .lte('entry_date', endDate.toISOString().split('T')[0])
      .order('entry_date', { ascending: true });
    
    if (diaryError) {
      console.error('AI Diary Analysis: Error fetching diary entries:', diaryError);
      return NextResponse.json({ error: '일기 내용을 불러오지 못했습니다.' }, { status: 500 });
    }

    if (!diaryEntries || diaryEntries.length === 0) {
      console.warn(`AI Diary Analysis: No diary entries found for ${analysisMonth} for user ${user.id}.`);
      return NextResponse.json(
        { error: `${analysisMonth}에 작성된 일기가 없습니다. 먼저 일기를 작성해주세요.` },
        { status: 400 }
      );
    }

    const combinedDiaryContent = diaryEntries.map(entry => (
      `제목: ${entry.title}\n내용: ${entry.content}\n기분: ${entry.mood || '없음'}\n태그: ${(entry.tags || []).join(', ') || '없음'}`
    )).join('\n\n---\n\n');

    // 4. AI 분석 요청 (사용자 키 사용)
    const prompt = [
      `너는 사용자의 일기 내용을 분석하여 월간 감정 통계를 내주는 전문 AI 분석가이다.`,
      `제공되는 일기 내용들을 종합하여 다음 정보를 JSON 형태로 반환한다.`,
      `요구사항:
        - 전체적인 감성 점수 (긍정/부정/중립 0~1 사이의 float 값, 합은 1이 되도록)
          예: {\"positive\": 0.7, \"negative\": 0.2, \"neutral\": 0.1}
        - 주요 감정 키워드 (최대 5개, 한국어)
        - 주요 토픽 키워드 (최대 5개, 한국어, 일상/관계/업무/취미 등)
        - 한 달간의 감정 변화 요약 (200자 내외, 한국어). 어떤 감정들이 지배적이었고, 주요 이벤트는 무엇이었는지.
        - 출력은 반드시 JSON으로만 반환한다. JSON 형식:
          {\"sentiment_score\": {\"positive\": 0.7, \"negative\": 0.2, \"neutral\": 0.1},
          \"keywords\": [\"행복\", \"스트레스\"],
          \"topics\": [\"일상\", \"친구\"],
          \"summary\": \"한 달간의 감정 변화 요약...\"}
      `,
      `분석 대상 일기 내용:`,
      combinedDiaryContent,
    ].filter(Boolean).join('\n');

    const systemPrompt = '한국어로만 답변한다. 사용자의 감정을 분석하고 따뜻하게 요약한다.';
    let aiResponseContent = '';

    // AI Provider에 따라 API 호출
    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userApiKey}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 1000, // 충분한 길이 확보
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        await logAiUsage({
          userId: user.id,
          feature: 'diary_analysis',
          provider,
          model: OPENAI_MODEL,
          statusCode: response.status,
          latencyMs: Date.now() - startedAt,
          success: false,
          errorMessage: errorText,
        });
        return NextResponse.json(
          { error: buildUpstreamError(provider, response.status, errorText) },
          { status: response.status }
        );
      }
      const data = await response.json();
      aiResponseContent = data?.choices?.[0]?.message?.content || '';
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
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        await logAiUsage({
          userId: user.id,
          feature: 'diary_analysis',
          provider,
          model: ANTHROPIC_MODEL,
          statusCode: response.status,
          latencyMs: Date.now() - startedAt,
          success: false,
          errorMessage: errorText,
        });
        return NextResponse.json(
          { error: buildUpstreamError(provider, response.status, errorText) },
          { status: response.status }
        );
      }
      const data = await response.json();
      aiResponseContent = data?.content?.map((part: any) => part?.text || '').join('') || '';
    } else if (provider === 'google') {
      // Google Gemini API integration (simplified)
      const GOOGLE_CANDIDATE_MODELS = Array.from(
        new Set([
          GOOGLE_MODEL,
          'gemini-1.5-flash',
          'gemini-1.5-flash-latest',
          'gemini-1.0-pro',
          'gemini-1.0-pro-latest',
        ])
      );
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
          aiResponseContent =
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
          feature: 'diary_analysis',
          provider,
          model: GOOGLE_MODEL,
          statusCode: googleStatus,
          latencyMs: Date.now() - startedAt,
          success: false,
          errorMessage: googleErrorText,
        });
        return NextResponse.json(
          { error: buildUpstreamError(provider, googleStatus, googleErrorText) },
          { status: googleStatus }
        );
      }
    } else {
      console.error('AI Diary Analysis: Unsupported AI provider:', provider);
      return NextResponse.json({ error: `지원하지 않는 AI 제공자입니다: ${provider}` }, { status: 400 });
    }

    // AI 응답 파싱 및 저장
    let parsedAnalysis: any = null;
    try {
      parsedAnalysis = JSON.parse(aiResponseContent);
    } catch (parseError) {
      console.error('AI Diary Analysis: Failed to parse AI response JSON:', parseError, aiResponseContent);
      return NextResponse.json({ error: 'AI 분석 결과 파싱에 실패했습니다.' }, { status: 500 });
    }

    const { data: savedInsight, error: saveError } = await supabase
      .from('diary_insights')
      .insert({
        user_id: user.id,
        analysis_month: analysisMonth,
        analysis_date: new Date().toISOString(),
        sentiment_score: parsedAnalysis.sentiment_score || {},
        keywords: parsedAnalysis.keywords || [],
        topics: parsedAnalysis.topics || [],
        summary: parsedAnalysis.summary || '',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      })
      .select('*')
      .single();

    if (saveError) {
      console.error('AI Diary Analysis: Error saving insight to DB:', saveError);
      return NextResponse.json({ error: 'AI 분석 결과 저장에 실패했습니다.' }, { status: 500 });
    }

    await logAiUsage({
      userId: user.id,
      feature: 'diary_analysis',
      provider,
      model: provider === 'openai' ? OPENAI_MODEL : provider === 'anthropic' ? ANTHROPIC_MODEL : GOOGLE_MODEL, // Corrected model logging
      statusCode: 200,
      latencyMs: Date.now() - startedAt,
      success: true,
    });

    console.log(`AI Diary Analysis: Successfully generated and saved insight for user ${user.id} for ${analysisMonth}.`);
    return NextResponse.json({ success: true, insight: savedInsight });

  } catch (error) {
    console.error('AI Diary Analysis: Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
