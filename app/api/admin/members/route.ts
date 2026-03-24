import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

const ADMIN_EMAILS = ['hakdjhakdj@gmail.com'];

export async function GET(request: NextRequest) {
  try {
    // Use regular client for auth check
    const supabase = await createClient();
    
    // Check if user is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!ADMIN_EMAILS.includes(user.email || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const type = request.nextUrl.searchParams.get('type'); // 'paid' or 'free'

    // Use service client for admin operations
    const serviceSupabase = createServiceClient();
    
    // Get all users
    const { data: { users }, error: usersError } = await serviceSupabase.auth.admin.listUsers();

    if (usersError) throw usersError;

    // Get active subscriptions
    const { data: subscriptions, error: subError } = await serviceSupabase
      .from('subscriptions')
      .select('user_id, plan_id, current_period_end, created_at')
      .eq('status', 'active')
      .gt('current_period_end', new Date().toISOString());

    if (subError) throw subError;

    const paidUserIds = new Set(subscriptions?.map(s => s.user_id) || []);

    if (type === 'paid') {
      // Get plan details
      const planIds = [...new Set(subscriptions?.map(s => s.plan_id) || [])];
      const { data: plans, error: plansError } = await serviceSupabase
        .from('plans')
        .select('*')
        .in('id', planIds);

      if (plansError) throw plansError;

      const planMap = new Map(plans?.map(p => [p.id, p]) || []);
      const userMap = new Map(users?.map(u => [u.id, u.email]) || []);

      const paidMembers = subscriptions
        ?.filter(sub => userMap.has(sub.user_id))
        .map(sub => {
          const plan = planMap.get(sub.plan_id);
          const userEmail = userMap.get(sub.user_id);
          const userCreatedAt = users?.find(u => u.id === sub.user_id)?.created_at;
          
          return {
            id: sub.user_id,
            email: userEmail || '',
            created_at: userCreatedAt || sub.created_at,
            subscription: {
              plan_name: plan?.name || 'Unknown',
              plan_price: plan?.price || 0,
              current_period_end: sub.current_period_end,
            }
          };
        }) || [];

      return NextResponse.json({ members: paidMembers });
    } else {
      // Free members
      const freeMembers = users
        ?.filter(u => !paidUserIds.has(u.id))
        .map(u => ({
          id: u.id,
          email: u.email || '',
          created_at: u.created_at,
        })) || [];

      return NextResponse.json({ members: freeMembers });
    }
  } catch (error) {
    console.error('Error loading members:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
