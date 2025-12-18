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

    // 이미 활성 구독이 있는지 확인
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (existingSubscription) {
      return NextResponse.json(
        { error: '이미 활성 구독이 있습니다. 설정 페이지에서 플랜을 변경하세요.' },
        { status: 400 }
      );
    }

    // 테스트 모드: 직접 구독 생성 (실제 PortOne 연동 전)
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
      message: '구독이 활성화되었습니다!',
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

