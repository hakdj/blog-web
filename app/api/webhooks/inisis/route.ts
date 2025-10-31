import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * KG이니시스 전자계약 웹훅 처리
 * 
 * KG이니시스 설정:
 * - 웹훅 URL: https://your-domain.com/api/webhooks/inisis
 * - 로컬 개발: ngrok 등 터널링 도구 사용
 *   예: https://xxxx.ngrok.io/api/webhooks/inisis
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers = Object.fromEntries(request.headers.entries());
    
    // KG이니시스에서 전송하는 헤더 확인 (실제 문서에 맞게 수정 필요)
    const signature = request.headers.get('x-inisis-signature');
    const timestamp = request.headers.get('x-inisis-timestamp');
    
    console.log('KG이니시스 웹훅 수신:', {
      timestamp: new Date().toISOString(),
      signature: signature ? '존재' : '없음',
      bodyLength: body.length,
    });

    // 서명 검증 (KG이니시스 제공 방식에 맞게 구현 필요)
    // TODO: 실제 서명 검증 로직 구현
    // const isValid = verifyInisisSignature(body, signature, timestamp);
    // if (!isValid) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const event = JSON.parse(body);
    const supabase = createServiceClient();

    console.log('웹훅 이벤트:', event);

    // 이벤트 타입에 따른 처리
    switch (event.type || event.eventType) {
      case 'contract.completed':
      case 'contract_success':
        await handleContractCompleted(event, supabase);
        break;
      case 'contract.cancelled':
      case 'contract_failed':
        await handleContractCancelled(event, supabase);
        break;
      default:
        console.log('처리되지 않은 이벤트 타입:', event.type || event.eventType);
    }

    return NextResponse.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('KG이니시스 웹훅 오류:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * 계약 완료 처리
 */
async function handleContractCompleted(event: any, supabase: any) {
  try {
    const { userId, contractId, contractData } = event.data || event;
    
    // 계약 정보 저장 또는 업데이트 로직
    // 예시: subscriptions 테이블 업데이트 또는 새 테이블에 저장
    
    console.log('계약 완료 처리:', { userId, contractId });
    
    // TODO: 실제 계약 완료 처리 로직 구현
    // 예:
    // await supabase
    //   .from('contracts')
    //   .insert({
    //     user_id: userId,
    //     contract_id: contractId,
    //     status: 'completed',
    //     raw_data: contractData,
    //   });

    return { success: true };
  } catch (error) {
    console.error('계약 완료 처리 오류:', error);
    throw error;
  }
}

/**
 * 계약 취소 처리
 */
async function handleContractCancelled(event: any, supabase: any) {
  try {
    const { userId, contractId } = event.data || event;
    
    console.log('계약 취소 처리:', { userId, contractId });
    
    // TODO: 실제 계약 취소 처리 로직 구현
    
    return { success: true };
  } catch (error) {
    console.error('계약 취소 처리 오류:', error);
    throw error;
  }
}

/**
 * GET 요청 (웹훅 URL 검증용)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'KG이니시스 웹훅 엔드포인트',
    status: 'active',
    timestamp: new Date().toISOString(),
  });
}

