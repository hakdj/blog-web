import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptApiKey, maskApiKey } from '@/lib/ai-key-security';
import { providerLabel, resolveProvider } from '@/lib/ai-provider';

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

    const provider = resolveProvider(profileData?.ai_provider || (profileData?.openai_api_key ? 'openai' : 'openai'));
    const hasKey = Boolean(
      profileData?.ai_api_key_encrypted || profileData?.ai_api_key || profileData?.openai_api_key
    );
    const masked = String(profileData?.ai_key_masked || '').trim();
    return NextResponse.json({
      hasKey,
      provider,
      providerLabel: providerLabel(provider),
      maskedKey: masked,
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

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        ai_provider: provider,
        ai_api_key_encrypted: encrypted,
        ai_key_masked: masked,
        ai_key_rotated_at: new Date().toISOString(),
        ai_api_key: null,
        openai_api_key: provider === 'openai' ? null : null,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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

export async function DELETE() {
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
      .select('ai_provider, ai_key_masked')
      .eq('id', user.id)
      .maybeSingle();

    const { error } = await supabase
      .from('profiles')
      .update({
        ai_provider: null,
        ai_api_key_encrypted: null,
        ai_key_masked: null,
        ai_api_key: null,
        openai_api_key: null,
      })
      .eq('id', user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from('ai_key_rotation_logs').insert({
      user_id: user.id,
      provider: resolveProvider(profileData?.ai_provider || 'openai'),
      key_masked: profileData?.ai_key_masked || null,
      action: 'delete',
    });

    return NextResponse.json({ success: true, message: 'AI 키가 삭제되었습니다.' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

