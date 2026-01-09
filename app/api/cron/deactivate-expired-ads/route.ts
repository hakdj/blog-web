import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 종료일이 지난 광고를 자동으로 비활성화하는 Cron Job
 * Vercel Cron: 매일 자정에 실행
 */
export async function GET(request: NextRequest) {
  try {
    // Cron Secret 검증
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('❌ Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 광고 만료 체크 시작...');

    const supabase = await createClient();

    // 종료일이 지난 활성 광고 조회
    const { data: expiredAds, error: fetchError } = await supabase
      .from('user_ads')
      .select('id, title, user_id, end_date')
      .eq('status', 'active')
      .not('end_date', 'is', null)
      .lt('end_date', new Date().toISOString());

    if (fetchError) {
      console.error('❌ 만료 광고 조회 오류:', fetchError);
      throw fetchError;
    }

    if (!expiredAds || expiredAds.length === 0) {
      console.log('✅ 만료된 광고 없음');
      return NextResponse.json({
        success: true,
        message: '만료된 광고 없음',
        deactivated: 0
      });
    }

    console.log(`📢 ${expiredAds.length}개의 만료된 광고 발견:`, expiredAds);

    // 만료된 광고 비활성화
    const { error: updateError } = await supabase
      .from('user_ads')
      .update({ 
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .in('id', expiredAds.map(ad => ad.id));

    if (updateError) {
      console.error('❌ 광고 비활성화 오류:', updateError);
      throw updateError;
    }

    console.log(`✅ ${expiredAds.length}개의 광고가 비활성화되었습니다.`);

    return NextResponse.json({
      success: true,
      message: `${expiredAds.length}개의 광고가 비활성화되었습니다.`,
      deactivated: expiredAds.length,
      ads: expiredAds
    });

  } catch (error) {
    console.error('❌ Cron 실행 오류:', error);
    return NextResponse.json(
      { 
        error: 'Failed to deactivate expired ads',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}
