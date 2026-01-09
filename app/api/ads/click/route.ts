import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 광고 클릭 추적
 * POST /api/ads/click
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { ad_id } = body;

    if (!ad_id) {
      return NextResponse.json(
        { error: 'ad_id is required' },
        { status: 400 }
      );
    }

    // 클라이언트 IP 가져오기
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // 클릭 기록
    const { error } = await supabase
      .from('ad_clicks')
      .insert({
        ad_id,
        user_ip: ip
      });

    if (error) {
      console.error('Error recording ad click:', error);
      return NextResponse.json(
        { error: 'Failed to record click' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Click recorded'
    });
  } catch (error) {
    console.error('Error in POST /api/ads/click:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
