import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 관리자 권한 확인 (API 라우트에서는 redirect 대신 에러 반환)
    const supabaseAuth = await createClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }
    
    const supabase = createServiceClient();

    // 기존 플랜 확인
    const { count: existingCount } = await supabase
      .from('plans')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // 플랜이 이미 있으면 스킵
    if (existingCount && existingCount > 0) {
      return NextResponse.json({
        success: true,
        message: `이미 ${existingCount}개의 활성 플랜이 있습니다.`,
        count: existingCount,
      });
    }

    // 플랜 데이터 삽입 (9,900원 기준)
    const plans = [
      {
        tier: 'standard',
        interval: 'month',
        name: '라떼 방구석',
        price: 9900,
        features: {
          subscription_type: 'monthly',
          rental_limit: 1,
          rental_categories: ['all'],
          delivery_fee: 0,
          free_trial: false,
        },
        is_active: true,
      },
      {
        tier: 'standard',
        interval: 'year',
        name: '라떼 방구석 연간',
        price: 99000,
        features: {
          subscription_type: 'yearly',
          rental_limit: 1,
          rental_categories: ['all'],
          delivery_fee: 0,
          free_trial: false,
          discount_rate: 17,
        },
        is_active: true,
      },
    ];

    const { data, error } = await supabase
      .from('plans')
      .insert(plans)
      .select();

    if (error) {
      console.error('플랜 생성 오류:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // RLS 정책 확인 및 설정 (서비스 클라이언트로는 정책을 만들 수 없으므로 SQL로 직접 실행 필요)
    // 하지만 플랜은 이미 생성되었으므로 정책이 없으면 Supabase 대시보드에서 설정해야 함

    return NextResponse.json({
      success: true,
      message: `${data.length}개의 플랜이 생성되었습니다.`,
      plans: data,
    });
  } catch (error: any) {
    console.error('플랜 초기화 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '알 수 없는 오류' },
      { status: 500 }
    );
  }
}
