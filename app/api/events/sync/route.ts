import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { fetchCurrentFestivals, convertTourEventToDbFormat } from '@/lib/tourapi';

/**
 * Tour API에서 축제 정보를 가져와 DB에 동기화
 * 
 * 사용법:
 * POST /api/events/sync
 * 
 * 또는 Vercel Cron으로 자동 실행
 */
export async function POST(request: NextRequest) {
  try {
    // Cron Secret 검증 (보안)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Tour API 축제 정보 동기화 시작...');

    // Tour API에서 축제 정보 가져오기
    const festivals = await fetchCurrentFestivals();

    if (festivals.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Tour API에서 가져온 축제가 없습니다.',
        synced: 0,
      });
    }

    const supabase = createServiceClient();
    let syncedCount = 0;
    let skippedCount = 0;

    for (const festival of festivals) {
      try {
        // DB 형식으로 변환
        const eventData = convertTourEventToDbFormat(festival);

        // 이미 존재하는 이벤트인지 확인 (제목과 시작일로 중복 체크)
        const { data: existing } = await supabase
          .from('events')
          .select('id')
          .eq('title', eventData.title)
          .eq('start_date', eventData.start_date)
          .maybeSingle();

        if (existing) {
          // 이미 존재하면 업데이트
          const { error: updateError } = await supabase
            .from('events')
            .update({
              ...eventData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error(`이벤트 업데이트 실패: ${eventData.title}`, updateError);
            skippedCount++;
          } else {
            console.log(`✅ 이벤트 업데이트: ${eventData.title}`);
            syncedCount++;
          }
        } else {
          // 새 이벤트 추가
          const { error: insertError } = await supabase
            .from('events')
            .insert(eventData);

          if (insertError) {
            console.error(`이벤트 추가 실패: ${eventData.title}`, insertError);
            skippedCount++;
          } else {
            console.log(`✅ 새 이벤트 추가: ${eventData.title}`);
            syncedCount++;
          }
        }
      } catch (error) {
        console.error(`이벤트 처리 오류:`, error);
        skippedCount++;
      }
    }

    console.log(`🎉 동기화 완료: ${syncedCount}개 성공, ${skippedCount}개 실패`);

    return NextResponse.json({
      success: true,
      message: `${syncedCount}개의 축제 정보가 동기화되었습니다.`,
      synced: syncedCount,
      skipped: skippedCount,
      total: festivals.length,
    });

  } catch (error) {
    console.error('축제 정보 동기화 오류:', error);
    return NextResponse.json(
      { error: '동기화 중 오류가 발생했습니다.', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET 요청으로 수동 동기화 트리거
 */
export async function GET(request: NextRequest) {
  return POST(request);
}

