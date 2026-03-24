import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const ADMIN_EMAILS = ['hakdjhakdj@gmail.com'];

function isAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email);
}

function parseRange(request: NextRequest) {
  const from = request.nextUrl.searchParams.get('from');
  const to = request.nextUrl.searchParams.get('to');
  if (!from || !to) return null;
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return null;
  return {
    fromIso: fromDate.toISOString(),
    toIso: toDate.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const status = request.nextUrl.searchParams.get('status'); // pending|active|inactive|rejected|all
    const range = parseRange(request);

    const service = createServiceClient();
    let query = service
      .from('user_ads')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: ads, error } = await query;
    if (error) throw error;

    const { data: userList, error: usersError } = await service.auth.admin.listUsers();
    if (usersError) throw usersError;

    const emailMap = new Map((userList.users || []).map((u) => [u.id, u.email]));
    const adIds = (ads || []).map((ad: any) => ad.id);

    let periodViewsMap = new Map<string, number>();
    let periodClicksMap = new Map<string, number>();

    if (range && adIds.length > 0) {
      const { data: viewsRows } = await service
        .from('ad_views')
        .select('ad_id')
        .in('ad_id', adIds)
        .gte('viewed_at', range.fromIso)
        .lte('viewed_at', range.toIso);

      const { data: clicksRows } = await service
        .from('ad_clicks')
        .select('ad_id')
        .in('ad_id', adIds)
        .gte('clicked_at', range.fromIso)
        .lte('clicked_at', range.toIso);

      periodViewsMap = (viewsRows || []).reduce((acc, row: any) => {
        acc.set(row.ad_id, (acc.get(row.ad_id) || 0) + 1);
        return acc;
      }, new Map<string, number>());

      periodClicksMap = (clicksRows || []).reduce((acc, row: any) => {
        acc.set(row.ad_id, (acc.get(row.ad_id) || 0) + 1);
        return acc;
      }, new Map<string, number>());
    }

    const enriched = (ads || []).map((ad: any) => ({
      ...ad,
      user_email: emailMap.get(ad.user_id) || null,
      period_views: periodViewsMap.get(ad.id) || 0,
      period_clicks: periodClicksMap.get(ad.id) || 0,
    }));

    return NextResponse.json({ ads: enriched });
  } catch (error) {
    console.error('Error in GET /api/admin/ads:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, title, description, image_url, link_url, end_date, status, reject_reason } = body || {};

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const service = createServiceClient();
    const updates: any = {};
    if (typeof title === 'string') updates.title = title;
    if (typeof description === 'string' || description === null) updates.description = description;
    if (typeof image_url === 'string' || image_url === null) updates.image_url = image_url;
    if (typeof link_url === 'string') updates.link_url = link_url;
    if (typeof status === 'string') updates.status = status;
    if (typeof reject_reason === 'string' || reject_reason === null) {
      updates.reject_reason = reject_reason;
      updates.rejected_at = reject_reason ? new Date().toISOString() : null;
    }
    if (updates.status === 'active') {
      updates.reject_reason = null;
      updates.rejected_at = null;
    }
    if (end_date === '' || end_date === null || typeof end_date === 'undefined') {
      // ignore unless explicitly null
      if (end_date === null) updates.end_date = null;
    } else {
      updates.end_date = end_date;
    }

    const { data, error } = await service
      .from('user_ads')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, ad: data });
  } catch (error) {
    console.error('Error in PATCH /api/admin/ads:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

