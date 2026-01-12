import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const { planId } = await request.json();

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }
    
    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // 이미 활성 구독이 있는지 확인 (가장 최근 것)
    const { data: existingSubscriptions } = await supabase
      .from('subscriptions')
      .select('id, plan_id, current_period_end')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    const existingSubscription = existingSubscriptions?.[0] || null;

    if (existingSubscription) {
      // 기존 구독 종료일 가져오기
      const currentEndDate = new Date(existingSubscription.current_period_end);
      
      // 새 플랜 기간 계산 (기존 종료일에 추가)
      const newPeriodEnd = new Date(currentEndDate);
      if (plan.interval === 'year') {
        newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
      } else {
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
      }

      // 같은 플랜인지 확인
      if (existingSubscription.plan_id === planId) {
        // 같은 플랜 재구독 → 기간 연장
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            current_period_end: newPeriodEnd.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSubscription.id);

        if (updateError) {
          console.error('Subscription extension error:', updateError);
          return NextResponse.json(
            { error: '구독 연장 실패: ' + updateError.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `구독이 ${newPeriodEnd.toLocaleDateString('ko-KR')}까지 연장되었습니다!`,
          new_period_end: newPeriodEnd.toISOString(),
        });
      }

      // 다른 플랜으로 변경 → 플랜 변경 + 기간 연장
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          plan_id: planId,
          current_period_end: newPeriodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSubscription.id);

      if (updateError) {
        console.error('Plan change error:', updateError);
        return NextResponse.json(
          { error: '플랜 변경 실패: ' + updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `플랜이 변경되고 ${newPeriodEnd.toLocaleDateString('ko-KR')}까지 연장되었습니다!`,
        new_period_end: newPeriodEnd.toISOString(),
      });
    }

    // ============================================
    // 🧪 테스트 모드: 결제 없이 바로 구독 생성
    // ============================================
    // 실제 운영 시에는 아래 코드를 주석 처리하고
    // PortOne 결제 연동 코드를 활성화해야 합니다.
    // 
    // 실제 운영 흐름:
    // 1. PortOne 결제창 열기
    // 2. 사용자 결제 완료
    // 3. PortOne 웹훅으로 결제 확인
    // 4. 웹훅에서 구독 생성
    // ============================================
    
    const currentPeriodEnd = new Date();
    if (plan.interval === 'year') {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    } else {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    }

    const { error: insertError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan_id: planId,
        status: 'active',
        current_period_end: currentPeriodEnd.toISOString(),
        auto_renew: false, // 테스트 모드에서는 자동 갱신 비활성화
      });

    if (insertError) {
      console.error('Subscription creation error:', insertError);
      return NextResponse.json(
        { error: '구독 생성 실패: ' + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '구독이 활성화되었습니다! (테스트 모드)',
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

