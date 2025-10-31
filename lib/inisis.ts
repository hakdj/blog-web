/**
 * KG이니시스 전자계약 유틸리티
 */

interface InisisConfig {
  apiKey: string;
  apiSecret: string;
  mid: string; // 상점 ID
  webhookSecret?: string;
}

const config: InisisConfig = {
  apiKey: process.env.INISIS_API_KEY || '',
  apiSecret: process.env.INISIS_API_SECRET || '',
  mid: process.env.INISIS_MID || '',
  webhookSecret: process.env.INISIS_WEBHOOK_SECRET,
};

/**
 * 전자계약 세션 생성
 */
export interface CreateContractSessionRequest {
  userId: string;
  userEmail: string;
  userName: string;
  contractType: string;
  metadata?: Record<string, any>;
}

export interface CreateContractSessionResponse {
  success: boolean;
  contractUrl?: string;
  error?: string;
}

export async function createContractSession({
  userId,
  userEmail,
  userName,
  contractType,
  metadata,
}: CreateContractSessionRequest): Promise<CreateContractSessionResponse> {
  try {
    // TODO: KG이니시스 실제 API 엔드포인트와 형식에 맞게 수정
    const response = await fetch('https://api.inisis.com/v1/contracts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'X-MID': config.mid,
      },
      body: JSON.stringify({
        userId,
        userEmail,
        userName,
        contractType,
        successUrl: `${process.env.APP_URL}/api/inisis/callback?success=true`,
        failUrl: `${process.env.APP_URL}/api/inisis/callback?success=false`,
        cancelUrl: `${process.env.APP_URL}/api/inisis/callback?cancel=true`,
        metadata: {
          ...metadata,
          userId,
          timestamp: new Date().toISOString(),
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Contract session creation failed');
    }

    return {
      success: true,
      contractUrl: data.contractUrl,
    };
  } catch (error) {
    console.error('전자계약 세션 생성 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 웹훅 서명 검증
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string = config.webhookSecret || ''
): boolean {
  try {
    const crypto = require('crypto');
    
    // KG이니시스 서명 검증 방식 (실제 문서에 맞게 수정 필요)
    const message = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('서명 검증 오류:', error);
    return false;
  }
}

/**
 * 웹훅 이벤트 타입
 */
export interface InisisWebhookEvent {
  type: string;
  eventType?: string;
  data: {
    userId?: string;
    contractId?: string;
    status?: string;
    contractData?: Record<string, any>;
  };
  timestamp?: string;
}

