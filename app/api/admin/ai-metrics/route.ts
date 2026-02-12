import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth';

type Provider = 'openai' | 'anthropic' | 'google';

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
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const service = createServiceClient();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await service
      .from('ai_request_logs')
      .select('provider, success, status_code, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = data || [];
    const providers: Provider[] = ['openai', 'anthropic', 'google'];
    const initial = providers.reduce(
      (acc, provider) => {
        acc[provider] = { total: 0, success: 0, error4xx: 0, error5xx: 0 };
        return acc;
      },
      {} as Record<Provider, { total: number; success: number; error4xx: number; error5xx: number }>
    );

    rows.forEach((row: any) => {
      const provider = providers.includes(row.provider) ? (row.provider as Provider) : 'openai';
      const bucket = initial[provider];
      bucket.total += 1;
      if (row.success) bucket.success += 1;
      if (row.status_code >= 400 && row.status_code < 500) bucket.error4xx += 1;
      if (row.status_code >= 500) bucket.error5xx += 1;
    });

    const byProvider = providers.map((provider) => {
      const m = initial[provider];
      return {
        provider,
        total: m.total,
        successRate: m.total ? Math.round((m.success / m.total) * 1000) / 10 : 0,
        error4xx: m.error4xx,
        error5xx: m.error5xx,
      };
    });

    const dailyMap = new Map<string, number>();
    rows.forEach((row: any) => {
      const day = String(row.created_at).slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
    });

    return NextResponse.json({
      windowDays: 7,
      totalRequests: rows.length,
      byProvider,
      daily: Array.from(dailyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, count]) => ({ date, count })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

