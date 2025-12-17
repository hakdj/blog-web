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

// 빌링키로 정기결제 요청
export interface RecurringPaymentRequest {
  billingKey: string;
  amount: number;
  orderName: string;
  customerId: string;
  customerEmail: string;
}

export interface RecurringPaymentResponse {
  success: boolean;
  paymentId?: string;
  error?: string;
}

export async function chargeWithBillingKey({
  billingKey,
  amount,
  orderName,
  customerId,
  customerEmail,
}: RecurringPaymentRequest): Promise<RecurringPaymentResponse> {
  try {
    const response = await fetch(`https://api.portone.io/v2/billing-keys/${billingKey}/charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        amount,
        currency: 'KRW',
        orderName,
        customerId,
        customerEmail,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Recurring payment failed');
    }

    return {
      success: true,
      paymentId: data.paymentId,
    };
  } catch (error) {
    console.error('Error charging with billing key:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// 빌링키 발급 (카드 등록)
export interface IssueBillingKeyRequest {
  userId: string;
  userEmail: string;
  cardNumber: string;
  expiryYear: string;
  expiryMonth: string;
  birthOrBusinessNumber: string;
  passwordTwoDigits: string;
}

export interface IssueBillingKeyResponse {
  success: boolean;
  billingKey?: string;
  error?: string;
}

export async function issueBillingKey({
  userId,
  userEmail,
  cardNumber,
  expiryYear,
  expiryMonth,
  birthOrBusinessNumber,
  passwordTwoDigits,
}: IssueBillingKeyRequest): Promise<IssueBillingKeyResponse> {
  try {
    const response = await fetch('https://api.portone.io/v2/billing-keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        customerId: userId,
        customerEmail: userEmail,
        card: {
          number: cardNumber,
          expiryYear,
          expiryMonth,
          birthOrBusinessNumber,
          passwordTwoDigits,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Billing key issuance failed');
    }

    return {
      success: true,
      billingKey: data.billingKey,
    };
  } catch (error) {
    console.error('Error issuing billing key:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// 빌링키 삭제
export async function deleteBillingKey(billingKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`https://api.portone.io/v2/billing-keys/${billingKey}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Billing key deletion failed');
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting billing key:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

