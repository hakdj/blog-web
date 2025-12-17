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

    // Fetch active subscriptions
    const { count: activeSubscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (subsError) {
      console.error('Admin API - Error fetching subscriptions:', subsError);
      throw subsError;
    }

    // Calculate total revenue
    const { data: revenueData, error: revenueError } = await supabase
      .from('subscriptions')
      .select(`
        plans (
          price
        )
      `)
      .eq('status', 'active');

    if (revenueError) {
      console.error('Admin API - Error fetching revenue:', revenueError);
      throw revenueError;
    }

    const totalRevenue = revenueData?.reduce((sum, sub: any) => {
      return sum + (sub.plans?.price || 0);
    }, 0) || 0;

    // Fetch recent users
    const { data: recentUsers, error: recentError } = await supabase
      .from('profiles')
      .select('id, email, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('Admin API - Error fetching recent users:', recentError);
      throw recentError;
    }

    const responseData = {
      totalUsers: totalUsers || 0,
      activeSubscriptions: activeSubscriptions || 0,
      totalRevenue,
      recentUsers: recentUsers || []
    };

    console.log('Admin API - Success:', responseData);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Admin API - Exception:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin data: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
