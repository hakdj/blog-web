import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { verifyWebhookSignature, WebhookEvent } from '@/lib/portone';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-portone-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(
      body,
      signature,
      process.env.PORTONE_WEBHOOK_SECRET!
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event: WebhookEvent = JSON.parse(body);
    const supabase = createServiceClient();

    console.log('Webhook event received:', event);

    switch (event.type) {
      case 'payment.succeeded':
        await handlePaymentSucceeded(event, supabase);
        break;
      case 'payment.failed':
        await handlePaymentFailed(event, supabase);
        break;
      case 'subscription.updated':
        await handleSubscriptionUpdated(event, supabase);
        break;
      case 'subscription.canceled':
        await handleSubscriptionCanceled(event, supabase);
        break;
      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentSucceeded(event: WebhookEvent, supabase: any) {
  const data = event.data;
  
  // 무결성 검증: 플랜 가격 확인
  const { data: planData } = await supabase
    .from('plans')
    .select('price, interval')
    .eq('id', data.metadata.planId)
    .single();

  if (!planData || planData.price !== data.amount) {
    console.error('⚠️ 웹훅 금액 불일치 혹은 플랜을 찾을 수 없습니다.', {
      planPrice: planData?.price,
      amountPaid: data.amount,
      userId: data.customerId
    });
    // 부정 결제 의심으로 실패 또는 알림 처리를 할 수 있지만,
    // 일단은 에러 로깅 후 결제 완료 기록 시 비정상 상태(suspected_fraud)를 남기도록 확장 가능합니다.
  }

  // interval에 맞춰 연장일 계산
  const isYearly = planData?.interval === 'year' || data.metadata.interval === 'year';
  const durationMs = isYearly ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  
  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_end: new Date(Date.now() + durationMs).toISOString(),
    })
    .eq('user_id', data.customerId);

  // Create payment record
  await supabase
    .from('payments')
    .insert({
      user_id: data.customerId,
      amount: data.amount,
      currency: data.currency,
      paid_at: new Date().toISOString(),
      pg_tid: data.paymentId,
      status: 'paid',
      raw_webhook: event,
    });

  console.log('Payment succeeded processed for user:', data.customerId);
}

async function handlePaymentFailed(event: WebhookEvent, supabase: any) {
  const data = event.data;
  
  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('user_id', data.customerId);

  // Create payment record
  await supabase
    .from('payments')
    .insert({
      user_id: data.customerId,
      amount: data.amount,
      currency: data.currency,
      paid_at: new Date().toISOString(),
      pg_tid: data.paymentId,
      status: 'failed',
      raw_webhook: event,
    });

  console.log('Payment failed processed for user:', data.customerId);
}

async function handleSubscriptionUpdated(event: WebhookEvent, supabase: any) {
  const data = event.data;
  
  // interval에 맞춰 연장일 계산
  const isYearly = data.metadata?.interval === 'year';
  const durationMs = isYearly ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;

  await supabase
    .from('subscriptions')
    .update({
      current_period_end: new Date(Date.now() + durationMs).toISOString(),
    })
    .eq('user_id', data.customerId);

  console.log('Subscription updated for user:', data.customerId);
}

async function handleSubscriptionCanceled(event: WebhookEvent, supabase: any) {
  const data = event.data;
  
  await supabase
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('user_id', data.customerId);

  console.log('Subscription canceled for user:', data.customerId);
}

