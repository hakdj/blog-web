import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPaymentSession } from '@/lib/portone';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    console.log('Checkout API - Start');
    const user = await requireAuth();
    console.log('Checkout API - User:', user.id);
    
    const { planId } = await request.json();
    console.log('Checkout API - Plan ID:', planId);

    if (!planId) {
      console.error('Checkout API - No plan ID provided');
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      console.error('Checkout API - Plan not found:', planError);
      return NextResponse.json(
        { error: 'Plan not found: ' + (planError?.message || 'Unknown error') },
        { status: 404 }
      );
    }

    console.log('Checkout API - Plan found:', plan.name);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Checkout API - Profile not found:', profileError);
      return NextResponse.json(
        { error: 'User profile not found: ' + (profileError?.message || 'Unknown error') },
        { status: 404 }
      );
    }

    console.log('Checkout API - Profile found:', profile.email);

    // 임시: 바로 구독 생성 (실제 결제 없이 테스트)
    // TODO: 나중에 실제 PortOne 결제로 변경
    
    // 기존 구독 확인
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (existingSubscription) {
      // 기존 구독 업데이트
      console.log('Checkout API - Updating existing subscription');
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          plan_id: planId,
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSubscription.id);
      
      if (updateError) {
        console.error('Checkout API - Update subscription error:', updateError);
        throw updateError;
      }
    } else {
      // 새 구독 생성
      console.log('Checkout API - Creating new subscription');
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_id: planId,
          status: 'active',
          start_date: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          auto_renew: true,
        });
      
      if (insertError) {
        console.error('Checkout API - Insert subscription error:', insertError);
        throw insertError;
      }
    }

    // 결제 기록 생성
    console.log('Checkout API - Creating payment record');
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        amount: plan.price,
        currency: 'KRW',
        paid_at: new Date().toISOString(),
        status: 'paid',
        payment_method: 'test',
      });

    if (paymentError) {
      console.error('Checkout API - Payment record error:', paymentError);
      // 결제 기록 실패해도 구독은 생성됨
    }

    console.log('Checkout API - Success!');
    return NextResponse.json({
      success: true,
      message: '구독이 활성화되었습니다 (테스트 모드)',
    });
  } catch (error) {
    console.error('Checkout API - Fatal error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

