import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function getUser() {
  const supabase = createClient();
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

  const supabase = createClient();
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
  if (!user) return null;

  const supabase = createClient();
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      plan:plans(*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .gt('current_period_end', new Date().toISOString())
    .single();

  if (error) {
    console.error('Error getting subscription:', error);
    return null;
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

