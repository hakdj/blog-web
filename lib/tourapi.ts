/**
 * 한국관광공사 Tour API 연동
 * https://api.visitkorea.or.kr
 */

const TOUR_API_KEY = process.env.TOUR_API_KEY || process.env.NEXT_PUBLIC_TOUR_API_KEY;
const TOUR_API_BASE_URL = 'https://apis.data.go.kr/B551011/KorService1';

export interface TourEvent {
  title: string;
  addr1: string; // 주소
  addr2?: string; // 상세주소
  tel?: string; // 전화번호
  firstimage?: string; // 대표이미지
  eventstartdate: string; // 시작일 (YYYYMMDD)
  eventenddate: string; // 종료일 (YYYYMMDD)
  contentid: string; // 콘텐츠 ID
  contenttypeid: string; // 콘텐츠 타입 ID
  mapx?: string; // GPS X좌표
  mapy?: string; // GPS Y좌표
  mlevel?: string; // 지도 레벨
  areacode?: string; // 지역코드
}

/**
 * 지역코드 매핑
 */
const AREA_CODE_MAP: { [key: string]: string } = {
  '1': '서울',
  '2': '인천',
  '3': '대전',
  '4': '대구',
  '5': '광주',
  '6': '부산',
  '7': '울산',
  '8': '세종',
  '31': '경기',
  '32': '강원',
  '33': '충북',
  '34': '충남',
  '35': '경북',
  '36': '경남',
  '37': '전북',
  '38': '전남',
  '39': '제주',
};

/**
 * 날짜 포맷 변환 (YYYYMMDD -> YYYY-MM-DD)
 */
function formatDate(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) return '';
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

/**
 * 현재 진행 중인 축제 정보 가져오기
 */
export async function fetchCurrentFestivals(): Promise<TourEvent[]> {
  if (!TOUR_API_KEY) {
    console.error('Tour API Key가 설정되지 않았습니다.');
    return [];
  }

  try {
    const today = new Date();
    const eventStartDate = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    
    // 3개월 후까지의 이벤트 조회
    const futureDate = new Date(today);
    futureDate.setMonth(futureDate.getMonth() + 3);
    const eventEndDate = futureDate.toISOString().slice(0, 10).replace(/-/g, '');

    const params = new URLSearchParams({
      serviceKey: decodeURIComponent(TOUR_API_KEY), // API 키 디코딩
      numOfRows: '100',
      pageNo: '1',
      MobileOS: 'ETC',
      MobileApp: 'LatтeBanggusuk',
      _type: 'json',
      listYN: 'Y',
      arrange: 'A', // 제목순
      eventStartDate: eventStartDate,
      eventEndDate: eventEndDate,
    });

    const url = `${TOUR_API_BASE_URL}/searchFestival1?${params.toString()}`;
    
    console.log('🔍 Tour API 요청 URL 생성 완료');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log('📡 Tour API 응답 상태:', response.status);

    if (!response.ok) {
      console.error(`❌ Tour API HTTP 오류: ${response.status}`);
      const errorText = await response.text();
      console.error('오류 내용:', errorText.substring(0, 200));
      throw new Error(`Tour API 오류: ${response.status}`);
    }

    const data = await response.json();
    console.log('📦 Tour API 응답 구조:', Object.keys(data));
    
    // API 응답 구조 확인
    const items = data?.response?.body?.items?.item;
    
    if (!items) {
      console.warn('⚠️ Tour API 응답에 이벤트가 없습니다.');
      console.log('📦 응답 body:', data?.response?.body);
      return [];
    }

    console.log(`✅ Tour API에서 ${Array.isArray(items) ? items.length : 1}개의 원본 데이터 수신`);

    // 배열이 아닌 경우 배열로 변환
    const eventList = Array.isArray(items) ? items : [items];
    
    console.log(`Tour API에서 ${eventList.length}개의 축제 정보를 가져왔습니다.`);
    
    return eventList;
  } catch (error) {
    console.error('Tour API 호출 오류:', error);
    return [];
  }
}

/**
 * Tour API 이벤트를 DB 형식으로 변환
 */
export function convertTourEventToDbFormat(tourEvent: TourEvent) {
  const region = AREA_CODE_MAP[tourEvent.areacode || ''] || '기타';
  
  return {
    title: tourEvent.title,
    description: `${tourEvent.addr1 || ''} ${tourEvent.addr2 || ''}`.trim(),
    event_type: 'festival' as const,
    region: region,
    location: tourEvent.addr1 || '',
    start_date: formatDate(tourEvent.eventstartdate),
    end_date: formatDate(tourEvent.eventenddate),
    image_url: tourEvent.firstimage || null,
    link_url: `https://www.visitkorea.or.kr/detail/ms_detail.do?cotid=${tourEvent.contentid}`,
    contact_info: tourEvent.tel || null,
    is_featured: false,
    is_active: true,
  };
}

/**
 * 지역별 축제 정보 가져오기
 */
export async function fetchFestivalsByArea(areaCode: string): Promise<TourEvent[]> {
  if (!TOUR_API_KEY) {
    console.error('Tour API Key가 설정되지 않았습니다.');
    return [];
  }

  try {
    const today = new Date();
    const eventStartDate = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const futureDate = new Date(today);
    futureDate.setMonth(futureDate.getMonth() + 3);
    const eventEndDate = futureDate.toISOString().slice(0, 10).replace(/-/g, '');

    const params = new URLSearchParams({
      serviceKey: TOUR_API_KEY,
      numOfRows: '50',
      pageNo: '1',
      MobileOS: 'ETC',
      MobileApp: 'LaттeBanggusuk',
      _type: 'json',
      listYN: 'Y',
      arrange: 'A',
      areaCode: areaCode,
      eventStartDate: eventStartDate,
      eventEndDate: eventEndDate,
    });

    const url = `${TOUR_API_BASE_URL}/searchFestival1?${params.toString()}`;
    
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Tour API 오류: ${response.status}`);
    }

    const data = await response.json();
    const items = data?.response?.body?.items?.item;
    
    if (!items) return [];

    return Array.isArray(items) ? items : [items];
  } catch (error) {
    console.error('Tour API 호출 오류:', error);
    return [];
  }
}

