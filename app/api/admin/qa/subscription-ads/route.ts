import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const ADMIN_EMAILS = ['hakdjhakdj@naver.com', 'hakdjhakdj@gmail.com'];

function isAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email);
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const service = createServiceClient();
    const nowIso = new Date().toISOString();

    const { data: activeAds, error: activeAdsError } = await service
      .from('user_ads')
      .select('id, user_id, status, end_date')
      .eq('status', 'active');
    if (activeAdsError) throw activeAdsError;

    const { data: validSubs, error: subsError } = await service
      .from('subscriptions')
      .select('user_id')
      .eq('status', 'active')
      .gt('current_period_end', nowIso);
    if (subsError) throw subsError;

    const validUserIds = new Set((validSubs || []).map((s: any) => s.user_id));
    const ads = activeAds || [];
    const activeAdsWithoutValidSubscription = ads.filter((ad: any) => !validUserIds.has(ad.user_id)).length;
    const activeAdsPastEndDate = ads.filter((ad: any) => ad.end_date && new Date(ad.end_date) < new Date()).length;

    const checks = [
      {
        key: 'activeAdsWithoutValidSubscription',
        label: '만료/비활성 구독 사용자의 활성 광고',
        failedCount: activeAdsWithoutValidSubscription,
        passed: activeAdsWithoutValidSubscription === 0,
      },
      {
        key: 'activeAdsPastEndDate',
        label: '종료일이 지났는데 활성 상태인 광고',
        failedCount: activeAdsPastEndDate,
        passed: activeAdsPastEndDate === 0,
      },
    ];

    return NextResponse.json({
      checks,
      generated_at: new Date().toISOString(),
      all_passed: checks.every((c) => c.passed),
    });
  } catch (error) {
    console.error('Error in GET /api/admin/qa/subscription-ads:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
