import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// 서버 사이드에서 플랜을 가져오는 API
// 서비스 클라이언트를 사용하여 RLS 정책을 완전히 우회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const interval = searchParams.get('interval') || 'month';
    
    // 서비스 클라이언트 사용 (RLS 우회)
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('interval', interval)
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (error) {
      console.error('플랜 가져오기 오류:', error);
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details },
        { status: 500 }
      );
    }
    
    console.log(`플랜 가져오기 성공: ${data?.length || 0}개 플랜 발견`);
    return NextResponse.json({ plans: data || [] });
  } catch (error: any) {
    console.error('플랜 API 오류:', error);
    return NextResponse.json(
      { error: error.message || '알 수 없는 오류', stack: error.stack },
      { status: 500 }
    );
  }
}

