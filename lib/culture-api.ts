/**
 * 문화체육관광부 공연전시정보 조회 API
 * https://www.culture.go.kr/data
 */

const CULTURE_API_KEY = process.env.CULTURE_API_KEY || process.env.NEXT_PUBLIC_CULTURE_API_KEY;
const CULTURE_API_BASE_URL = 'http://www.culture.go.kr/openapi/rest/publicperformancedisplays';

export interface CultureEvent {
  seq: string; // 공연ID
  title: string; // 공연명
  startDate: string; // 공연시작일
  endDate: string; // 공연종료일
  place: string; // 공연장소
  realmName: string; // 장르
  area: string; // 지역
  thumbnail: string; // 썸네일
  gpsX: string; // GPS X좌표
  gpsY: string; // GPS Y좌표
}

/**
 * 현재 진행 중인 공연/전시 정보 가져오기
 */
export async function fetchCurrentCultureEvents(): Promise<CultureEvent[]> {
  if (!CULTURE_API_KEY) {
    console.error('❌ Culture API Key가 설정되지 않았습니다.');
    return [];
  }

  console.log('🔑 Culture API Key 확인: ', CULTURE_API_KEY ? '설정됨' : '없음');

  try {
    const today = new Date();
    const from = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const futureDate = new Date(today);
    futureDate.setMonth(futureDate.getMonth() + 3);
    const to = futureDate.toISOString().slice(0, 10).replace(/-/g, '');

    const params = new URLSearchParams({
      serviceKey: CULTURE_API_KEY,
      rows: '100',
      cPage: '1',
      from: from,
      to: to,
      sortStdr: '1', // 등록일순
    });

    const url = `${CULTURE_API_BASE_URL}/period?${params.toString()}`;
    
    console.log('🔍 Culture API 요청 URL 생성 완료');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log('📡 Culture API 응답 상태:', response.status);

    if (!response.ok) {
      console.error(`❌ Culture API HTTP 오류: ${response.status}`);
      const errorText = await response.text();
      console.error('오류 내용:', errorText.substring(0, 200));
      throw new Error(`Culture API 오류: ${response.status}`);
    }

    const data = await response.json();
    console.log('📦 Culture API 응답 구조:', Object.keys(data));
    
    const items = data?.msgBody;
    
    if (!items || items.length === 0) {
      console.warn('⚠️ Culture API 응답에 이벤트가 없습니다.');
      console.log('📦 응답 데이터:', JSON.stringify(data).substring(0, 200));
      return [];
    }

    console.log(`✅ Culture API에서 ${items.length}개의 원본 데이터 수신`);

    console.log(`Culture API에서 ${items.length}개의 공연/전시 정보를 가져왔습니다.`);
    
    return items;
  } catch (error) {
    console.error('Culture API 호출 오류:', error);
    return [];
  }
}

/**
 * Culture API 이벤트를 DB 형식으로 변환
 */
export function convertCultureEventToDbFormat(cultureEvent: CultureEvent) {
  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 8) return '';
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  };

  return {
    title: cultureEvent.title,
    description: `${cultureEvent.realmName} - ${cultureEvent.place}`,
    event_type: 'local_feature' as const,
    region: cultureEvent.area || '서울',
    location: cultureEvent.place,
    start_date: formatDate(cultureEvent.startDate),
    end_date: formatDate(cultureEvent.endDate),
    image_url: cultureEvent.thumbnail || null,
    link_url: `http://www.culture.go.kr/festival/festival.do?seq=${cultureEvent.seq}`,
    contact_info: null,
    is_featured: false,
    is_active: true,
  };
}

