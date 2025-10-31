import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const success = searchParams.get('success');
  const paymentId = searchParams.get('payment_id');
  const billingKey = searchParams.get('billing_key');

  if (success === 'true' && paymentId && billingKey) {
    try {
      const supabase = createServiceClient();
      
      // Get payment details from Portone (mock implementation)
      // In real implementation, you would fetch from Portone API
      const paymentData = {
        amount: 9900, // This should come from Portone API
        currency: 'KRW',
        pg_tid: paymentId,
        status: 'paid',
      };

      // Get user from payment metadata (in real implementation, get from Portone)
      const { data: user } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single();

      if (!user) {
        throw new Error('User not found');
      }

      // Create or update subscription
      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      const subscriptionData = {
        user_id: user.id,
        plan_id: 'default-plan-id', // This should come from payment metadata
        status: 'active',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        billing_key: billingKey,
      };

      if (existingSubscription) {
        await supabase
          .from('subscriptions')
          .update(subscriptionData)
          .eq('id', existingSubscription.id);
      } else {
        await supabase
          .from('subscriptions')
          .insert(subscriptionData);
      }

      // Create payment record
      await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          subscription_id: existingSubscription?.id,
          amount: paymentData.amount,
          currency: paymentData.currency,
          paid_at: new Date().toISOString(),
          pg_tid: paymentData.pg_tid,
          status: paymentData.status,
        });

      return redirect(`${process.env.APP_URL}/dashboard?success=true`);
    } catch (error) {
      console.error('Billing callback error:', error);
      return redirect(`${process.env.APP_URL}/pricing?error=payment_failed`);
    }
  }

  return redirect(`${process.env.APP_URL}/pricing?error=payment_failed`);
}

