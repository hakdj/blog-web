interface PortoneConfig {
  apiKey: string;
  apiSecret: string;
  webhookSecret: string;
}

const config: PortoneConfig = {
  apiKey: process.env.PORTONE_API_KEY!,
  apiSecret: process.env.PORTONE_API_SECRET!,
  webhookSecret: process.env.PORTONE_WEBHOOK_SECRET!,
};

export interface CreatePaymentSessionRequest {
  planId: string;
  userId: string;
  userEmail: string;
  amount: number;
  interval: 'month' | 'year';
}

export interface CreatePaymentSessionResponse {
  success: boolean;
  paymentUrl?: string;
  error?: string;
}

export async function createPaymentSession({
  planId,
  userId,
  userEmail,
  amount,
  interval,
}: CreatePaymentSessionRequest): Promise<CreatePaymentSessionResponse> {
  try {
    const response = await fetch('https://api.portone.io/v2/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        amount: amount,
        currency: 'KRW',
        orderName: `${interval === 'month' ? '월간' : '연간'} 구독`,
        customerEmail: userEmail,
        customerId: userId,
        successUrl: `${process.env.APP_URL}/api/billing/callback?success=true`,
        failUrl: `${process.env.APP_URL}/api/billing/callback?success=false`,
        metadata: {
          planId,
          interval,
          userId,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Payment session creation failed');
    }

    return {
      success: true,
      paymentUrl: data.paymentUrl,
    };
  } catch (error) {
    console.error('Error creating payment session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

export interface WebhookEvent {
  type: string;
  data: {
    paymentId: string;
    status: string;
    amount: number;
    currency: string;
    customerId: string;
    metadata: {
      planId: string;
      interval: string;
      userId: string;
    };
  };
}

/**
 * 빌링키 발급 (결제 수단 등록)
 */
export interface IssueBillingKeyRequest {
  customer_uid: string;  // 고객 고유 ID (user.id)
  card_number: string;   // 카드 번호
  expiry: string;        // 유효기간 (YYYY-MM)
  birth: string;         // 생년월일 (YYMMDD)
  pwd_2digit: string;    // 카드 비밀번호 앞 2자리
}

export interface IssueBillingKeyResponse {
  success: boolean;
  billing_key?: string;
  error?: string;
}

export async function issueBillingKey(
  request: IssueBillingKeyRequest
): Promise<IssueBillingKeyResponse> {
  try {
    // PortOne API 호출
    const response = await fetch('https://api.portone.io/v2/billing-keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        customer_uid: request.customer_uid,
        card_number: request.card_number,
        expiry: request.expiry,
        birth: request.birth,
        pwd_2digit: request.pwd_2digit,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || '빌링키 발급 실패');
    }

    return {
      success: true,
      billing_key: data.billing_key || data.customer_uid,
    };
  } catch (error) {
    console.error('Error issuing billing key:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 빌링키로 결제 (자동 갱신용)
 */
export interface ChargeWithBillingKeyRequest {
  billing_key: string;
  amount: number;
  order_name: string;
  customer_uid: string;
}

export interface ChargeWithBillingKeyResponse {
  success: boolean;
  payment_id?: string;
  error?: string;
}

export async function chargeWithBillingKey(
  request: ChargeWithBillingKeyRequest
): Promise<ChargeWithBillingKeyResponse> {
  try {
    const response = await fetch('https://api.portone.io/v2/payments/billing-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        billing_key: request.billing_key,
        amount: request.amount,
        currency: 'KRW',
        order_name: request.order_name,
        customer_uid: request.customer_uid,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || '결제 실패');
    }

    return {
      success: true,
      payment_id: data.payment_id,
    };
  } catch (error) {
    console.error('Error charging with billing key:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 빌링키 삭제 (결제 수단 삭제)
 */
export interface DeleteBillingKeyResponse {
  success: boolean;
  error?: string;
}

export async function deleteBillingKey(
  billing_key: string
): Promise<DeleteBillingKeyResponse> {
  try {
    const response = await fetch(`https://api.portone.io/v2/billing-keys/${billing_key}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || '빌링키 삭제 실패');
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting billing key:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

