import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Admin API - Starting request...');

    // Check for service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      console.error('Admin API - Missing SUPABASE_URL');
      return NextResponse.json(
        { error: 'Server configuration error: Missing SUPABASE_URL' },
        { status: 500 }
      );
    }

    if (!supabaseServiceKey) {
      console.error('Admin API - Missing SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json(
        { error: 'Server configuration error: Missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      );
    }

    // Create admin client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Admin API - Fetching data...');

    // Fetch total users
    const { count: totalUsers, error: usersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (usersError) {
      console.error('Admin API - Error fetching users:', usersError);
      throw usersError;
    }

    // Fetch paid members (active subscriptions)
    const { count: paidMembers, error: paidError } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (paidError) {
      console.error('Admin API - Error fetching paid members:', paidError);
      throw paidError;
    }

    // Calculate free members
    const freeMembers = (totalUsers || 0) - (paidMembers || 0);

    // Fetch active subscriptions (keeping for compatibility)
    const activeSubscriptions = paidMembers;

    // Fetch active subscriptions with user and plan details
    const { data: activeSubsData, error: activeSubsError } = await supabase
      .from('subscriptions')
      .select('id, user_id, plan_id, status, created_at, current_period_end')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (activeSubsError) {
      console.error('Admin API - Error fetching active subscriptions:', activeSubsError);
    }

    // Get user emails and plan details for subscriptions
    let subscribers: any[] = [];
    let totalRevenue = 0;
    
    if (activeSubsData && activeSubsData.length > 0) {
      const userIds = activeSubsData.map((sub: any) => sub.user_id);
      const planIds = [...new Set(activeSubsData.map((sub: any) => sub.plan_id))];
      
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);
      
      // Fetch plans
      const { data: plansData, error: plansError } = await supabase
        .from('plans')
        .select('id, name, price')
        .in('id', planIds);

      if (!profilesError && !plansError && profilesData && plansData) {
        const profileMap = new Map(profilesData.map((p: any) => [p.id, p.email]));
        const planMap = new Map(plansData.map((p: any) => [p.id, { name: p.name, price: p.price }]));
        
        subscribers = activeSubsData.map((sub: any) => {
          const plan = planMap.get(sub.plan_id);
          if (plan) {
            totalRevenue += plan.price;
          }
          return {
            id: sub.id,
            email: profileMap.get(sub.user_id) || 'Unknown',
            plan_name: plan?.name || 'Unknown',
            plan_price: plan?.price || 0,
            created_at: sub.created_at,
            current_period_end: sub.current_period_end
          };
        });
      }
    }

    // Fetch recent users
    const { data: recentProfiles, error: recentError } = await supabase
      .from('profiles')
      .select('id, email, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('Admin API - Error fetching recent users:', recentError);
    }

    const recentUsers = recentProfiles?.map((profile: any) => ({
      id: profile.id,
      email: profile.email || 'No email',
      created_at: profile.created_at
    })) || [];

    // Fetch all users with subscription status
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from('profiles')
      .select('id, email, created_at')
      .order('created_at', { ascending: false });

    if (allProfilesError) {
      console.error('Admin API - Error fetching all profiles:', allProfilesError);
    }

    // Get paid user IDs
    const paidUserIds = new Set(subscribers.map(sub => 
      allProfiles?.find((p: any) => p.email === sub.email)?.id
    ).filter(Boolean));

    // Separate paid and free members
    const paidMembersList = allProfiles?.filter((profile: any) => 
      paidUserIds.has(profile.id)
    ).map((profile: any) => ({
      id: profile.id,
      email: profile.email || 'No email',
      created_at: profile.created_at,
      subscription: subscribers.find(sub => sub.email === profile.email)
    })) || [];

    const freeMembersList = allProfiles?.filter((profile: any) => 
      !paidUserIds.has(profile.id)
    ).map((profile: any) => ({
      id: profile.id,
      email: profile.email || 'No email',
      created_at: profile.created_at
    })) || [];

    const responseData = {
      totalUsers: totalUsers || 0,
      paidMembers: paidMembers || 0,
      freeMembers: freeMembers || 0,
      activeSubscriptions: activeSubscriptions || 0, // 호환성 유지
      totalRevenue: totalRevenue || 0,
      recentUsers: recentUsers || [],
      subscribers: subscribers || [],
      paidMembersList: paidMembersList || [],
      freeMembersList: freeMembersList || []
    };

    console.log('Admin API - Success:', responseData);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Admin API - Exception:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch admin data: ' + (error as Error).message,
        // Return default data on error so page doesn't break
        totalUsers: 0,
        paidMembers: 0,
        freeMembers: 0,
        activeSubscriptions: 0,
        totalRevenue: 0,
        recentUsers: [],
        subscribers: [],
        paidMembersList: [],
        freeMembersList: []
      },
      { status: 200 } // Return 200 with default data instead of 500
    );
  }
}
