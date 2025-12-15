import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 서버 사이드에서 플랜을 가져오는 API
// RLS 정책 문제를 우회하기 위해 서버 사이드에서 처리
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const interval = searchParams.get('interval') || 'month';
    
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('interval', interval)
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (error) {
      console.error('플랜 가져오기 오류:', error);
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ plans: data || [] });
  } catch (error: any) {
    console.error('플랜 API 오류:', error);
    return NextResponse.json(
      { error: error.message || '알 수 없는 오류' },
      { status: 500 }
    );
  }
}

