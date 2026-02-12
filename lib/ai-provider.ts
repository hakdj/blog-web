export type AiProvider = 'openai' | 'anthropic' | 'google';

export function resolveProvider(raw?: string | null): AiProvider {
  const value = String(raw || '').toLowerCase();
  if (value === 'anthropic' || value === 'claude') return 'anthropic';
  if (value === 'google' || value === 'gemini') return 'google';
  return 'openai';
}

export function providerLabel(provider: AiProvider): string {
  if (provider === 'google') return 'Google Gemini';
  if (provider === 'anthropic') return 'Claude';
  return 'OpenAI';
}

