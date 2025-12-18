import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { fetchCurrentFestivals, convertTourEventToDbFormat } from '@/lib/tourapi';
import { fetchCurrentCultureEvents, convertCultureEventToDbFormat } from '@/lib/culture-api';
import { fetchSeoulEvents, convertSeoulEventToDbFormat, fetchGyeonggiEvents } from '@/lib/local-event-api';

/**
 * 다중 API에서 이벤트 정보를 가져와 DB에 동기화
 * 
 * 연동 API:
 * 1. 한국관광공사 Tour API - 전국 축제
 * 2. 문화체육관광부 공연전시정보 API - 공연/전시
 * 3. 서울열린데이터광장 - 서울 문화행사
 * 4. 경기데이터드림 - 경기도 행사
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

    console.log('🔄 다중 API 이벤트 정보 동기화 시작...');

    const supabase = createServiceClient();
    let totalSynced = 0;
    let totalSkipped = 0;
    const results: any = {};

    // 1. 한국관광공사 Tour API - 전국 축제
    console.log('📍 1/4: Tour API 축제 정보 수집 중...');
    const festivals = await fetchCurrentFestivals();

    let tourSynced = 0;
    let tourSkipped = 0;

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
            tourSkipped++;
          } else {
            tourSynced++;
          }
        } else {
          // 새 이벤트 추가
          const { error: insertError } = await supabase
            .from('events')
            .insert(eventData);

          if (insertError) {
            tourSkipped++;
          } else {
            tourSynced++;
          }
        }
      } catch (error) {
        tourSkipped++;
      }
    }

    results.tour = { synced: tourSynced, skipped: tourSkipped, total: festivals.length };
    totalSynced += tourSynced;
    totalSkipped += tourSkipped;

    // 2. 문화체육관광부 공연전시정보 API
    console.log('📍 2/4: Culture API 공연/전시 정보 수집 중...');
    const cultureEvents = await fetchCurrentCultureEvents();
    let cultureSynced = 0;
    let cultureSkipped = 0;

    for (const event of cultureEvents) {
      try {
        const eventData = convertCultureEventToDbFormat(event);
        const { data: existing } = await supabase
          .from('events')
          .select('id')
          .eq('title', eventData.title)
          .eq('start_date', eventData.start_date)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('events')
            .update({ ...eventData, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
          error ? cultureSkipped++ : cultureSynced++;
        } else {
          const { error } = await supabase.from('events').insert(eventData);
          error ? cultureSkipped++ : cultureSynced++;
        }
      } catch (error) {
        cultureSkipped++;
      }
    }

    results.culture = { synced: cultureSynced, skipped: cultureSkipped, total: cultureEvents.length };
    totalSynced += cultureSynced;
    totalSkipped += cultureSkipped;

    // 3. 서울열린데이터광장
    console.log('📍 3/4: Seoul API 문화행사 정보 수집 중...');
    const seoulEvents = await fetchSeoulEvents();
    let seoulSynced = 0;
    let seoulSkipped = 0;

    for (const event of seoulEvents) {
      try {
        const eventData = convertSeoulEventToDbFormat(event);
        const { data: existing } = await supabase
          .from('events')
          .select('id')
          .eq('title', eventData.title)
          .eq('start_date', eventData.start_date)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('events')
            .update({ ...eventData, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
          error ? seoulSkipped++ : seoulSynced++;
        } else {
          const { error } = await supabase.from('events').insert(eventData);
          error ? seoulSkipped++ : seoulSynced++;
        }
      } catch (error) {
        seoulSkipped++;
      }
    }

    results.seoul = { synced: seoulSynced, skipped: seoulSkipped, total: seoulEvents.length };
    totalSynced += seoulSynced;
    totalSkipped += seoulSkipped;

    // 4. 경기데이터드림
    console.log('📍 4/4: Gyeonggi API 행사 정보 수집 중...');
    const gyeonggiEvents = await fetchGyeonggiEvents();
    results.gyeonggi = { synced: 0, skipped: 0, total: gyeonggiEvents.length };

    console.log(`🎉 전체 동기화 완료: ${totalSynced}개 성공, ${totalSkipped}개 실패`);

    return NextResponse.json({
      success: true,
      message: `${totalSynced}개의 이벤트 정보가 동기화되었습니다.`,
      synced: totalSynced,
      skipped: totalSkipped,
      results: results,
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

