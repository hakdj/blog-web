import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptApiKey, maskApiKey } from '@/lib/ai-key-security';
import { providerLabel, resolveProvider } from '@/lib/ai-provider';
import { getAiCredentials, getUserAiCredentials } from '@/lib/ai-credentials';

async function syncProfileFromActiveKey(supabase: any, userId: string, email?: string | null) {
  const { data: keys } = await supabase
    .from('ai_user_keys')
    .select('provider, key_encrypted, key_masked, is_active, created_at')
    .eq('user_id', userId)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false });

  const active = (keys || []).find((k: any) => k.is_active) || (keys || [])[0];
  if (active) {
    await supabase.from('profiles').upsert({
      id: userId,
      email,
      ai_provider: resolveProvider(active.provider),
      ai_api_key_encrypted: active.key_encrypted,
      ai_key_masked: active.key_masked,
      ai_key_rotated_at: new Date().toISOString(),
      ai_api_key: null,
      openai_api_key: null,
    });
    return;
  }

  await supabase
    .from('profiles')
    .update({
      ai_provider: null,
      ai_api_key_encrypted: null,
      ai_key_masked: null,
      ai_api_key: null,
      openai_api_key: null,
    })
    .eq('id', userId);
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
      .select('ai_provider, ai_key_masked, ai_api_key_encrypted, ai_api_key, openai_api_key')
      .eq('id', user.id)
      .maybeSingle();

    const { data: keyRows } = await supabase
      .from('ai_user_keys')
      .select('id, provider, key_masked, is_active, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const keys = (keyRows || []).map((row: any) => ({
      id: row.id,
      provider: resolveProvider(row.provider),
      providerLabel: providerLabel(resolveProvider(row.provider)),
      maskedKey: row.key_masked,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
    }));

    const fromKeyring = keys.find((k) => k.isActive) || keys[0] || null;
    const provider = fromKeyring?.provider || resolveProvider(profileData?.ai_provider || 'openai');
    const activeMasked = fromKeyring?.maskedKey || '';
    const { apiKey } = getAiCredentials(profileData);
    const hasKey = keys.length > 0 || Boolean(apiKey);
    const masked = activeMasked || String(profileData?.ai_key_masked || '').trim() || (apiKey ? maskApiKey(apiKey) : '');
    return NextResponse.json({
      hasKey,
      provider,
      providerLabel: providerLabel(provider),
      maskedKey: masked,
      keys,
      activeKeyId: fromKeyring?.id || null,
    });
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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const provider = resolveProvider(body.provider);
    const key = String(body.key || '').trim();
    if (!key) {
      return NextResponse.json({ error: 'API 키를 입력해주세요.' }, { status: 400 });
    }

    const encrypted = encryptApiKey(key);
    const masked = maskApiKey(key);
    await supabase
      .from('ai_user_keys')
      .update({ is_active: false })
      .eq('user_id', user.id);

    const { data: inserted, error } = await supabase
      .from('ai_user_keys')
      .insert({
        user_id: user.id,
        provider,
        key_encrypted: encrypted,
        key_masked: masked,
        is_active: true,
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await syncProfileFromActiveKey(supabase, user.id, user.email);

    await supabase.from('ai_key_rotation_logs').insert({
      user_id: user.id,
      provider,
      key_masked: masked,
      action: 'rotate',
    });

    return NextResponse.json({
      success: true,
      provider,
      providerLabel: providerLabel(provider),
      keyId: inserted?.id,
      maskedKey: masked,
      message: `${providerLabel(provider)} API 키가 저장되었습니다.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const keyId = String(body.keyId || '').trim();
    if (!keyId) {
      return NextResponse.json({ error: '선택할 키가 없습니다.' }, { status: 400 });
    }

    await supabase.from('ai_user_keys').update({ is_active: false }).eq('user_id', user.id);
    const { error } = await supabase
      .from('ai_user_keys')
      .update({ is_active: true })
      .eq('id', keyId)
      .eq('user_id', user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await syncProfileFromActiveKey(supabase, user.id, user.email);
    const { provider } = await getUserAiCredentials(supabase, user.id, null);
    return NextResponse.json({
      success: true,
      provider,
      message: `${providerLabel(provider)} 키가 활성화되었습니다.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keyId = request.nextUrl.searchParams.get('id');
    if (keyId) {
      const { data: target } = await supabase
        .from('ai_user_keys')
        .select('provider, key_masked')
        .eq('id', keyId)
        .eq('user_id', user.id)
        .maybeSingle();

      const { error } = await supabase
        .from('ai_user_keys')
        .delete()
        .eq('id', keyId)
        .eq('user_id', user.id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      await syncProfileFromActiveKey(supabase, user.id, user.email);
      await supabase.from('ai_key_rotation_logs').insert({
        user_id: user.id,
        provider: resolveProvider(target?.provider || 'openai'),
        key_masked: target?.key_masked || null,
        action: 'delete',
      });
      return NextResponse.json({ success: true, message: '선택한 AI 키가 삭제되었습니다.' });
    }

    const { data: active } = await supabase
      .from('ai_user_keys')
      .select('id, provider, key_masked')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (active?.id) {
      await supabase.from('ai_user_keys').delete().eq('id', active.id).eq('user_id', user.id);
      await supabase.from('ai_key_rotation_logs').insert({
        user_id: user.id,
        provider: resolveProvider(active.provider || 'openai'),
        key_masked: active.key_masked || null,
        action: 'delete',
      });
    }

    await syncProfileFromActiveKey(supabase, user.id, user.email);

    return NextResponse.json({ success: true, message: 'AI 키가 삭제되었습니다.' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

