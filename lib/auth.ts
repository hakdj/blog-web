import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function getUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  
  return user;
}

export async function getUserProfile() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error getting profile:', error);
    return null;
  }

  return profile;
}

export async function getActiveSubscription() {
  const user = await getUser();
  if (!user) {
    console.log('🔍 getActiveSubscription: No user found');
    return null;
  }

  console.log('🔍 getActiveSubscription: Checking for user', user.id);

  const supabase = await createClient();
  const now = new Date().toISOString();
  console.log('🔍 Current time:', now);

  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      plan:plans(*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .gt('current_period_end', now)
    .order('created_at', { ascending: false });

  const subscription = subscriptions?.[0] || null;

  if (error) {
    console.error('❌ Error getting subscription:', error);
    return null;
  }

  if (subscription) {
    console.log('✅ Active subscription found:', {
      id: subscription.id,
      plan: subscription.plan?.name,
      end: subscription.current_period_end
    });
  } else {
    console.log('❌ No active subscription found');
  }

  return subscription;
}

export async function requireAuth() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

export async function requireSubscription() {
  const user = await requireAuth();
  const subscription = await getActiveSubscription();
  
  if (!subscription) {
    redirect('/pricing');
  }
  
  return { user, subscription };
}

// 관리자 이메일 목록
const ADMIN_EMAILS = ['hakdjhakdj@naver.com'];

export function isAdmin(user: { email?: string | null } | null): boolean {
  if (!user || !user.email) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (!isAdmin(user)) {
    redirect('/');
  }
  return user;
}
