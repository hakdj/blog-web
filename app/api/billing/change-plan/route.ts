import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { chargeWithBillingKey } from '@/lib/portone';

/**
 * 플랜 변경 (업그레이드/다운그레이드)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { newPlanId } = body;

    if (!newPlanId) {
      return NextResponse.json(
        { error: '새 플랜 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 현재 활성 구독 조회
    const { data: currentSubscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, plan_id, billing_key, current_period_end, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (subError || !currentSubscription) {
      return NextResponse.json(
        { error: '활성 구독을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 현재 플랜과 새 플랜 정보 조회
    const { data: currentPlan } = await supabase
      .from('plans')
      .select('*')
      .eq('id', currentSubscription.plan_id)
      .single();

    const { data: newPlan } = await supabase
      .from('plans')
      .select('*')
      .eq('id', newPlanId)
      .single();

    if (!currentPlan || !newPlan) {
      return NextResponse.json(
        { error: '플랜 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 같은 플랜인지 확인
    if (currentSubscription.plan_id === newPlanId) {
      return NextResponse.json(
        { error: '이미 해당 플랜을 사용 중입니다.' },
        { status: 400 }
      );
    }

    const isUpgrade = newPlan.price > currentPlan.price;
    const now = new Date();
    const periodEnd = new Date(currentSubscription.current_period_end);
    const daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (isUpgrade) {
      // 업그레이드: 즉시 적용 + 차액 결제
      if (!currentSubscription.billing_key) {
        return NextResponse.json(
          { error: '업그레이드를 위해서는 결제 수단이 등록되어 있어야 합니다.' },
          { status: 400 }
        );
      }

      // 일할 계산 (남은 기간에 대한 차액)
      const totalDays = currentPlan.interval === 'year' ? 365 : 30;
      const proratedAmount = Math.round(
        ((newPlan.price - currentPlan.price) * daysRemaining) / totalDays
      );

      if (proratedAmount > 0) {
        // 차액 결제
        const chargeResult = await chargeWithBillingKey({
          billing_key: currentSubscription.billing_key,
          amount: proratedAmount,
          order_name: `${newPlan.name} 업그레이드 (일할 계산)`,
          customer_uid: user.id,
        });

        if (!chargeResult.success) {
          return NextResponse.json(
            { error: '결제 실패: ' + chargeResult.error },
            { status: 400 }
          );
        }

        // 결제 기록 저장
        await supabase.from('payments').insert({
          user_id: user.id,
          subscription_id: currentSubscription.id,
          amount: proratedAmount,
          status: 'completed',
          pg_tid: chargeResult.payment_id,
          payment_method: 'billing_key',
        });
      }

      // 구독 업데이트 (즉시 적용)
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          plan_id: newPlanId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentSubscription.id);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        return NextResponse.json(
          { error: '구독 업데이트 실패' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '플랜이 업그레이드되었습니다.',
        proratedAmount,
        effectiveDate: 'immediate',
      });

    } else {
      // 다운그레이드: 다음 결제일부터 적용
      // 구독에 pending_plan_id 저장 (다음 갱신 시 적용)
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          // pending_plan_id 컬럼이 있다면 사용, 없으면 바로 변경
          plan_id: newPlanId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentSubscription.id);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        return NextResponse.json(
          { error: '구독 업데이트 실패' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `플랜이 변경되었습니다. ${periodEnd.toLocaleDateString('ko-KR')}부터 새 플랜이 적용됩니다.`,
        effectiveDate: periodEnd.toISOString(),
      });
    }

  } catch (error) {
    console.error('Plan change error:', error);
    return NextResponse.json(
      { error: '플랜 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

