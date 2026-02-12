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

export async function getUserAiCredentials(
  supabase: any,
  userId: string,
  profileFallback: ProfileLike | null
): Promise<{ provider: AiProvider; apiKey: string; keyId?: string | null }> {
  try {
    const { data, error } = await supabase
      .from('ai_user_keys')
      .select('id, provider, key_encrypted, is_active, created_at')
      .eq('user_id', userId)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const active = data.find((row: any) => row.is_active) || data[0];
      const provider = resolveProvider(active.provider);
      const apiKey = decryptApiKey(String(active.key_encrypted || '').trim());
      if (apiKey) {
        return { provider, apiKey, keyId: active.id };
      }
    }
  } catch {
    // keyring table may not exist yet; fallback below
  }

  const fallback = getAiCredentials(profileFallback);
  return { ...fallback, keyId: null };
}

