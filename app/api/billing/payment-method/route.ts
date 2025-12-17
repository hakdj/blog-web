import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { issueBillingKey, deleteBillingKey } from '@/lib/portone';

// 결제 수단 등록
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { cardNumber, expiryYear, expiryMonth, birthOrBusinessNumber, passwordTwoDigits } = await request.json();

    if (!cardNumber || !expiryYear || !expiryMonth || !birthOrBusinessNumber || !passwordTwoDigits) {
      return NextResponse.json(
        { error: 'All card information is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

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

    // 빌링키 발급
    const result = await issueBillingKey({
      userId: user.id,
      userEmail: profile.email,
      cardNumber,
      expiryYear,
      expiryMonth,
      birthOrBusinessNumber,
      passwordTwoDigits,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // 구독에 빌링키 저장
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ 
        billing_key: result.billingKey,
        auto_renew: true 
      })
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (updateError) {
      console.error('Error updating subscription with billing key:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: '결제 수단이 등록되었습니다.',
    });
  } catch (error) {
    console.error('Error registering payment method:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 결제 수단 삭제
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    // 현재 구독의 빌링키 가져오기
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, billing_key')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!subscription || !subscription.billing_key) {
      return NextResponse.json(
        { error: 'No payment method found' },
        { status: 404 }
      );
    }

    // PortOne에서 빌링키 삭제
    const result = await deleteBillingKey(subscription.billing_key);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // 구독에서 빌링키 제거 및 자동 갱신 비활성화
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ 
        billing_key: null,
        auto_renew: false 
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Error removing billing key from subscription:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: '결제 수단이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

