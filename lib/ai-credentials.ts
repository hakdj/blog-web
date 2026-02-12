import { decryptApiKey } from '@/lib/ai-key-security';
import { AiProvider, resolveProvider } from '@/lib/ai-provider';

type ProfileLike = {
  ai_provider?: string | null;
  ai_api_key_encrypted?: string | null;
  ai_api_key?: string | null;
  openai_api_key?: string | null;
};

export function getAiCredentials(profile: ProfileLike | null): { provider: AiProvider; apiKey: string } {
  const provider = resolveProvider(
    profile?.ai_provider || (profile?.openai_api_key ? 'openai' : 'openai')
  );
  const encrypted = String(profile?.ai_api_key_encrypted || '').trim();
  const fromEncrypted = encrypted ? decryptApiKey(encrypted) : '';
  const apiKey = String(fromEncrypted || profile?.ai_api_key || profile?.openai_api_key || '').trim();
  return { provider, apiKey };
}

