import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const ADMIN_EMAILS = ['hakdjhakdj@naver.com', 'hakdjhakdj@gmail.com'];

function isAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email);
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

    const enriched = (ads || []).map((ad: any) => ({
      ...ad,
      user_email: emailMap.get(ad.user_id) || null,
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
    const { id, title, description, image_url, link_url, end_date, status } = body || {};

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

