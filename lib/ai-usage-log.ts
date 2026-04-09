import { createServiceClient } from '@/lib/supabase/server';

type LogInput = {
  userId: string;
  feature: 'assistant_chat' | 'assistant_summary' | 'diary_draft' | 'diary_analysis';
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  statusCode: number;
  latencyMs: number;
  success: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
};

export async function logAiUsage(input: LogInput) {
  try {
    const supabase = createServiceClient();
    await supabase.from('ai_request_logs').insert({
      user_id: input.userId,
      feature: input.feature,
      provider: input.provider,
      model: input.model,
      status_code: input.statusCode,
      latency_ms: input.latencyMs,
      success: input.success,
      error_code: input.errorCode || null,
      error_message: input.errorMessage ? input.errorMessage.slice(0, 300) : null,
    });
  } catch (error) {
    console.error('AI usage log failed:', error);
  }
}

