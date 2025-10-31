import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * KG이니시스 전자계약 콜백 처리
 * 
 * 성공/실패/취소 후 리다이렉트 처리
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const success = searchParams.get('success');
  const cancel = searchParams.get('cancel');
  const contractId = searchParams.get('contract_id');
  const userId = searchParams.get('user_id');
  const error = searchParams.get('error');

  try {
    const supabase = createServiceClient();

    if (success === 'true' && contractId && userId) {
      // 계약 성공 처리
      console.log('계약 성공:', { contractId, userId });

      // TODO: 실제 계약 완료 처리 로직
      // 예: subscriptions 업데이트, 계약 정보 저장 등

      // 사용자를 대시보드로 리다이렉트
      return redirect(`/dashboard?contract=success&id=${contractId}`);
    }

    if (cancel === 'true') {
      // 계약 취소
      console.log('계약 취소:', { contractId, userId });
      return redirect(`/pricing?canceled=true`);
    }

    if (error) {
      // 계약 실패
      console.error('계약 실패:', { error, contractId, userId });
      return redirect(`/pricing?error=${encodeURIComponent(error)}`);
    }

    // 기본 리다이렉트
    return redirect('/pricing');
  } catch (error) {
    console.error('콜백 처리 오류:', error);
    return redirect('/pricing?error=callback_failed');
  }
}

