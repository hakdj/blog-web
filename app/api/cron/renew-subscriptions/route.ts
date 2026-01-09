import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { chargeWithBillingKey } from '@/lib/portone';

/**
 * 자동 구독 갱신 Cron Job
 * Vercel Cron으로 매일 실행
 */
export async function GET(request: NextRequest) {
  try {
    // Cron Secret 검증 (보안)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('🔄 Running subscription renewal cron job...');

    // 만료 예정 구독 조회 (오늘 ~ 내일 사이)
    const { data: expiringSubscriptions, error: fetchError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        user_id,
        plan_id,
        billing_key,
        current_period_end,
        auto_renew,
        plans (
          id,
          name,
          price,
          interval
        )
      `)
      .eq('status', 'active')
      .eq('auto_renew', true)
      .lte('current_period_end', tomorrow.toISOString())
      .gte('current_period_end', today.toISOString());

    if (fetchError) {
      console.error('Error fetching expiring subscriptions:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    if (!expiringSubscriptions || expiringSubscriptions.length === 0) {
      console.log('✅ No subscriptions to renew today');
      return NextResponse.json({
        success: true,
        message: 'No subscriptions to renew',
        renewed: 0,
      });
    }

    console.log(`📋 Found ${expiringSubscriptions.length} subscription(s) to renew`);

    let successCount = 0;
    let failCount = 0;
    const results = [];

    for (const subscription of expiringSubscriptions) {
      try {
        // 빌링키 확인
        if (!subscription.billing_key) {
          console.log(`⚠️ No billing key for subscription ${subscription.id}, skipping auto-renewal`);
          
          // 자동 갱신 비활성화
          await supabase
            .from('subscriptions')
            .update({ auto_renew: false })
            .eq('id', subscription.id);

          failCount++;
          results.push({
            subscription_id: subscription.id,
            success: false,
            reason: 'No billing key',
          });
          continue;
        }

        const plan = subscription.plans as any;
        if (!plan) {
          console.error(`❌ No plan found for subscription ${subscription.id}`);
          failCount++;
          continue;
        }

        // 빌링키로 결제
        console.log(`💳 Charging subscription ${subscription.id} for ${plan.price} KRW`);
        
        const chargeResult = await chargeWithBillingKey({
          billing_key: subscription.billing_key,
          amount: plan.price,
          order_name: `${plan.name} 자동 갱신`,
          customer_uid: subscription.user_id,
        });

        if (!chargeResult.success) {
          console.error(`❌ Payment failed for subscription ${subscription.id}:`, chargeResult.error);
          
          // 결제 실패 기록
          await supabase.from('payments').insert({
            user_id: subscription.user_id,
            subscription_id: subscription.id,
            amount: plan.price,
            status: 'failed',
            payment_method: 'billing_key',
            error_message: chargeResult.error,
          });

          // 자동 갱신 비활성화 (결제 실패 시)
          await supabase
            .from('subscriptions')
            .update({ auto_renew: false })
            .eq('id', subscription.id);

          failCount++;
          results.push({
            subscription_id: subscription.id,
            success: false,
            reason: chargeResult.error,
          });
          continue;
        }

        // 결제 성공: 구독 기간 연장
        const newPeriodEnd = new Date(subscription.current_period_end);
        if (plan.interval === 'year') {
          newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
        } else {
          newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
        }

        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            current_period_end: newPeriodEnd.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id);

        if (updateError) {
          console.error(`❌ Failed to update subscription ${subscription.id}:`, updateError);
          failCount++;
          continue;
        }

        // 결제 성공 기록
        await supabase.from('payments').insert({
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          amount: plan.price,
          status: 'completed',
          pg_tid: chargeResult.payment_id,
          payment_method: 'billing_key',
        });

        console.log(`✅ Successfully renewed subscription ${subscription.id}`);
        successCount++;
        results.push({
          subscription_id: subscription.id,
          success: true,
          new_period_end: newPeriodEnd.toISOString(),
        });

      } catch (error) {
        console.error(`❌ Error processing subscription ${subscription.id}:`, error);
        failCount++;
        results.push({
          subscription_id: subscription.id,
          success: false,
          reason: (error as Error).message,
        });
      }
    }

    console.log(`🎉 Renewal complete: ${successCount} success, ${failCount} failed`);

    // 추가: 종료일이 지난 광고 비활성화
    console.log('📢 Checking for expired ads...');
    let deactivatedAdsCount = 0;
    
    try {
      const { data: expiredAds, error: adsError } = await supabase
        .from('user_ads')
        .select('id, title, end_date')
        .eq('status', 'active')
        .not('end_date', 'is', null)
        .lt('end_date', new Date().toISOString());

      if (!adsError && expiredAds && expiredAds.length > 0) {
        console.log(`📢 Found ${expiredAds.length} expired ad(s)`);
        
        const { error: updateAdsError } = await supabase
          .from('user_ads')
          .update({ 
            status: 'inactive',
            updated_at: new Date().toISOString()
          })
          .in('id', expiredAds.map(ad => ad.id));

        if (!updateAdsError) {
          deactivatedAdsCount = expiredAds.length;
          console.log(`✅ Deactivated ${deactivatedAdsCount} expired ad(s)`);
        }
      } else {
        console.log('✅ No expired ads found');
      }
    } catch (adsError) {
      console.error('⚠️ Error checking expired ads (non-critical):', adsError);
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${expiringSubscriptions.length} subscription(s)`,
      renewed: successCount,
      failed: failCount,
      deactivated_ads: deactivatedAdsCount,
      results,
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

