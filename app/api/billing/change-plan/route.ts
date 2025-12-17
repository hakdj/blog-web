import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { chargeWithBillingKey } from '@/lib/portone';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { newPlanId } = await request.json();

    if (!newPlanId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 현재 구독 가져오기
    const { data: currentSubscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*, plans(*)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (subError || !currentSubscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // 새 플랜 정보 가져오기
    const { data: newPlan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', newPlanId)
      .eq('is_active', true)
      .single();

    if (planError || !newPlan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // 같은 플랜인지 확인
    if (currentSubscription.plan_id === newPlanId) {
      return NextResponse.json(
        { error: 'You are already on this plan' },
        { status: 400 }
      );
    }

    const currentPlan = currentSubscription.plans as any;
    const priceDifference = newPlan.price - currentPlan.price;

    // 업그레이드인 경우 차액 결제
    if (priceDifference > 0 && currentSubscription.billing_key) {
      // 사용자 프로필 가져오기
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!profile) {
        return NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        );
      }

      // 남은 기간 계산
      const now = new Date();
      const periodEnd = new Date(currentSubscription.current_period_end);
      const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const totalDays = currentPlan.interval === 'month' ? 30 : 365;
      
      // 일할 계산된 차액
      const proratedAmount = Math.round((priceDifference * daysRemaining) / totalDays);

      if (proratedAmount > 0) {
        // 차액 결제
        const paymentResult = await chargeWithBillingKey({
          billingKey: currentSubscription.billing_key,
          amount: proratedAmount,
          orderName: `플랜 업그레이드 차액 (${currentPlan.name} → ${newPlan.name})`,
          customerId: user.id,
          customerEmail: profile.email,
        });

        if (!paymentResult.success) {
          return NextResponse.json(
            { error: '차액 결제 실패: ' + paymentResult.error },
            { status: 400 }
          );
        }

        // 결제 기록 저장
        await supabase
          .from('payments')
          .insert({
            user_id: user.id,
            subscription_id: currentSubscription.id,
            amount: proratedAmount,
            currency: 'KRW',
            paid_at: new Date().toISOString(),
            pg_tid: paymentResult.paymentId,
            status: 'paid',
            payment_method: 'plan_upgrade',
          });
      }
    }

    // 플랜 변경
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        plan_id: newPlanId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentSubscription.id);

    if (updateError) {
      console.error('Error updating subscription plan:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: '플랜이 변경되었습니다.',
      priceDifference,
    });
  } catch (error) {
    console.error('Error changing plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

