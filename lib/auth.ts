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

  console.log('🔍 [v4-FIX] getActiveSubscription: Checking for user', user.id);

  const supabase = await createClient();

  // 모든 active 구독 가져오기 (날짜 필터링은 클라이언트에서)
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      plan:plans(*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error getting subscription:', error);
    return null;
  }

  console.log('🔍 [v4-FIX] Found subscriptions:', subscriptions?.length || 0);

  if (!subscriptions || subscriptions.length === 0) {
    console.log('❌ No active subscriptions found');
    return null;
  }

  // 클라이언트에서 날짜 필터링
  const now = new Date();
  const validSubscription = subscriptions.find(sub => {
    const endDate = new Date(sub.current_period_end);
    const isValid = endDate > now;
    console.log('🔍 [v4-FIX] Checking subscription:', {
      id: sub.id,
      end: sub.current_period_end,
      endDate: endDate.toISOString(),
      now: now.toISOString(),
      isValid
    });
    return isValid;
  });

  if (validSubscription) {
    console.log('✅ [v4-FIX] Valid subscription found:', {
      id: validSubscription.id,
      plan: validSubscription.plan?.name,
      end: validSubscription.current_period_end
    });
  } else {
    console.log('❌ No valid subscription found (all expired)');
  }

  return validSubscription || null;
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
