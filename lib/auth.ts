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

  console.log('🔍 [v5-SIMPLE] getActiveSubscription: Checking for user', user.id);

  const supabase = await createClient();

  // 단순하게: 모든 필드만 가져오기 (plan은 별도 조회)
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ [v5-SIMPLE] Error getting subscription:', error);
    return null;
  }

  console.log('🔍 [v5-SIMPLE] Found subscriptions:', subscriptions?.length || 0);

  if (!subscriptions || subscriptions.length === 0) {
    console.log('❌ [v5-SIMPLE] No active subscriptions');
    return null;
  }

  // 날짜 체크
  const now = new Date();
  const validSubscription = subscriptions.find(sub => {
    const endDate = new Date(sub.current_period_end);
    const isValid = endDate > now;
    console.log('🔍 [v5-SIMPLE] Checking:', {
      end: endDate.toISOString(),
      now: now.toISOString(),
      isValid
    });
    return isValid;
  });

  if (validSubscription) {
    // Plan 정보 별도 조회
    const { data: plan } = await supabase
      .from('plans')
      .select('*')
      .eq('id', validSubscription.plan_id)
      .single();
    
    const result = { ...validSubscription, plan };
    console.log('✅ [v5-SIMPLE] Valid subscription found');
    return result;
  }

  console.log('❌ [v5-SIMPLE] No valid subscription (all expired)');
  return null;
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

// 관리자 이메일 목록 (.env ADMIN_EMAILS="a@a.com,b@b.com" 우선)
const ADMIN_EMAILS = (
  process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean)
    : ['hakdjhakdj@naver.com', 'hakdjhakdj@gmail.com']
);

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
