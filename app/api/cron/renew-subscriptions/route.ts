import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { chargeWithBillingKey } from '@/lib/portone';

// Vercel Cron Job으로 매일 실행
// vercel.json에 설정 필요
export async function GET(request: NextRequest) {
  try {
    // Cron secret 검증 (보안)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const today = new Date();
    const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

    console.log('Cron: Checking subscriptions to renew...');

    // 만료 예정인 구독 찾기 (3일 이내 + 자동갱신 활성화)
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select(`
        id,
        user_id,
        plan_id,
        billing_key,
        current_period_end,
        auto_renew,
        plans (
          name,
          price,
          interval
        ),
        profiles (
          email
        )
      `)
      .eq('status', 'active')
      .eq('auto_renew', true)
      .not('billing_key', 'is', null)
      .lte('current_period_end', threeDaysFromNow.toISOString());

    if (error) {
      console.error('Cron: Error fetching subscriptions:', error);
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('Cron: No subscriptions to renew');
      return NextResponse.json({ 
        success: true, 
        message: 'No subscriptions to renew',
        renewed: 0 
      });
    }

    console.log(`Cron: Found ${subscriptions.length} subscriptions to renew`);

    const results = [];

    for (const subscription of subscriptions) {
      try {
        const plan = subscription.plans as any;
        const profile = subscription.profiles as any;

        console.log(`Cron: Processing subscription ${subscription.id} for user ${subscription.user_id}`);

        // 빌링키로 자동 결제
        const paymentResult = await chargeWithBillingKey({
          billingKey: subscription.billing_key!,
          amount: plan.price,
          orderName: `${plan.name} - ${plan.interval === 'month' ? '월간' : '연간'} 구독 갱신`,
          customerId: subscription.user_id,
          customerEmail: profile.email,
        });

        if (paymentResult.success) {
          // 결제 성공: 구독 기간 연장
          const intervalDays = plan.interval === 'month' ? 30 : 365;
          const newPeriodEnd = new Date(
            new Date(subscription.current_period_end).getTime() + intervalDays * 24 * 60 * 60 * 1000
          );

          await supabase
            .from('subscriptions')
            .update({
              current_period_end: newPeriodEnd.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', subscription.id);

          // 결제 기록 저장
          await supabase
            .from('payments')
            .insert({
              user_id: subscription.user_id,
              subscription_id: subscription.id,
              amount: plan.price,
              currency: 'KRW',
              paid_at: new Date().toISOString(),
              pg_tid: paymentResult.paymentId,
              status: 'paid',
              payment_method: 'auto_billing',
            });

          console.log(`Cron: Successfully renewed subscription ${subscription.id}`);
          results.push({
            subscriptionId: subscription.id,
            userId: subscription.user_id,
            status: 'success',
          });
        } else {
          // 결제 실패: 재시도 카운트 증가
          console.error(`Cron: Payment failed for subscription ${subscription.id}:`, paymentResult.error);

          // 실패 기록
          await supabase
            .from('payments')
            .insert({
              user_id: subscription.user_id,
              subscription_id: subscription.id,
              amount: plan.price,
              currency: 'KRW',
              status: 'failed',
              payment_method: 'auto_billing',
              error_message: paymentResult.error,
            });

          // 3회 실패 시 구독 취소
          const { data: failedPayments } = await supabase
            .from('payments')
            .select('id')
            .eq('subscription_id', subscription.id)
            .eq('status', 'failed')
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

          if (failedPayments && failedPayments.length >= 3) {
            await supabase
              .from('subscriptions')
              .update({
                status: 'cancelled',
                auto_renew: false,
                cancelled_at: new Date().toISOString(),
              })
              .eq('id', subscription.id);

            console.log(`Cron: Cancelled subscription ${subscription.id} due to repeated failures`);
          }

          results.push({
            subscriptionId: subscription.id,
            userId: subscription.user_id,
            status: 'failed',
            error: paymentResult.error,
          });
        }
      } catch (error) {
        console.error(`Cron: Error processing subscription ${subscription.id}:`, error);
        results.push({
          subscriptionId: subscription.id,
          userId: subscription.user_id,
          status: 'error',
          error: (error as Error).message,
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed' || r.status === 'error').length;

    console.log(`Cron: Completed. Success: ${successCount}, Failed: ${failedCount}`);

    return NextResponse.json({
      success: true,
      renewed: successCount,
      failed: failedCount,
      results,
    });
  } catch (error) {
    console.error('Cron: Fatal error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}



