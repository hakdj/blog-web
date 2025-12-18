import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { issueBillingKey, deleteBillingKey } from '@/lib/portone';

/**
 * 결제 수단 등록 (빌링키 발급)
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
    const { cardNumber, expiry, birth, pwd2digit } = body;

    // 입력 검증
    if (!cardNumber || !expiry || !birth || !pwd2digit) {
      return NextResponse.json(
        { error: '모든 카드 정보를 입력해주세요.' },
        { status: 400 }
      );
    }

    // PortOne 빌링키 발급
    const billingKeyResult = await issueBillingKey({
      customer_uid: user.id,
      card_number: cardNumber,
      expiry: expiry,
      birth: birth,
      pwd_2digit: pwd2digit,
    });

    if (!billingKeyResult.success) {
      return NextResponse.json(
        { error: billingKeyResult.error || '빌링키 발급 실패' },
        { status: 400 }
      );
    }

    // 활성 구독에 빌링키 저장
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: '활성 구독을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 구독에 빌링키 업데이트
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ 
        billing_key: billingKeyResult.billing_key,
        auto_renew: true  // 결제 수단 등록 시 자동 갱신 활성화
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Error updating subscription with billing key:', updateError);
      return NextResponse.json(
        { error: '구독 업데이트 실패' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '결제 수단이 등록되었습니다.',
      billing_key: billingKeyResult.billing_key
    });

  } catch (error) {
    console.error('Payment method registration error:', error);
    return NextResponse.json(
      { error: '결제 수단 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 결제 수단 삭제 (빌링키 삭제)
 */
export async function DELETE(request: NextRequest) {
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

    // 활성 구독 조회
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, billing_key')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: '활성 구독을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (!subscription.billing_key) {
      return NextResponse.json(
        { error: '등록된 결제 수단이 없습니다.' },
        { status: 404 }
      );
    }

    // PortOne에서 빌링키 삭제
    const deleteResult = await deleteBillingKey(subscription.billing_key);

    if (!deleteResult.success) {
      console.error('Failed to delete billing key from PortOne:', deleteResult.error);
      // PortOne 삭제 실패해도 DB에서는 삭제 진행
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
      return NextResponse.json(
        { error: '결제 수단 삭제 실패' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '결제 수단이 삭제되었습니다. 자동 갱신이 비활성화되었습니다.'
    });

  } catch (error) {
    console.error('Payment method deletion error:', error);
    return NextResponse.json(
      { error: '결제 수단 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

