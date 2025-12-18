/**
 * 지역별 행사 정보 API 통합
 * 서울열린데이터광장, 경기데이터드림 등
 */

const SEOUL_API_KEY = process.env.SEOUL_API_KEY || process.env.NEXT_PUBLIC_SEOUL_API_KEY;
const SEOUL_API_BASE_URL = 'http://openapi.seoul.go.kr:8088';

export interface SeoulEvent {
  CODENAME: string; // 코드명
  GUNAME: string; // 자치구
  TITLE: string; // 공연/행사명
  DATE: string; // 날짜
  PLACE: string; // 장소
  ORG_NAME: string; // 기관명
  USE_TRGT: string; // 이용대상
  USE_FEE: string; // 이용요금
  PLAYER: string; // 출연자정보
  PROGRAM: string; // 프로그램소개
  ETC_DESC: string; // 기타내용
  ORG_LINK: string; // 홈페이지 주소
  MAIN_IMG: string; // 대표이미지
  RGSTDATE: string; // 등록일
  TICKET: string; // 티켓예매처
  STRTDATE: string; // 시작일
  END_DATE: string; // 종료일
  THEMECODE: string; // 테마분류
}

/**
 * 서울시 문화행사 정보 가져오기
 */
export async function fetchSeoulEvents(): Promise<SeoulEvent[]> {
  if (!SEOUL_API_KEY) {
    console.error('Seoul API Key가 설정되지 않았습니다.');
    return [];
  }

  try {
    const url = `${SEOUL_API_BASE_URL}/${SEOUL_API_KEY}/json/culturalEventInfo/1/100/`;
    
    console.log('Seoul API 요청:', url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Seoul API 오류: ${response.status}`);
    }

    const data = await response.json();
    const items = data?.culturalEventInfo?.row;
    
    if (!items || items.length === 0) {
      console.log('Seoul API 응답에 이벤트가 없습니다.');
      return [];
    }

    // 현재 진행 중인 이벤트만 필터링
    const today = new Date();
    const currentEvents = items.filter((event: SeoulEvent) => {
      const endDate = new Date(event.END_DATE);
      return endDate >= today;
    });

    console.log(`Seoul API에서 ${currentEvents.length}개의 문화행사 정보를 가져왔습니다.`);
    
    return currentEvents;
  } catch (error) {
    console.error('Seoul API 호출 오류:', error);
    return [];
  }
}

/**
 * Seoul API 이벤트를 DB 형식으로 변환
 */
export function convertSeoulEventToDbFormat(seoulEvent: SeoulEvent) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    // YYYY-MM-DD 형식으로 이미 되어있음
    return dateStr.split(' ')[0];
  };

  return {
    title: seoulEvent.TITLE,
    description: seoulEvent.PROGRAM || seoulEvent.ETC_DESC || '',
    event_type: 'local_feature' as const,
    region: '서울',
    location: `${seoulEvent.GUNAME} ${seoulEvent.PLACE}`,
    start_date: formatDate(seoulEvent.STRTDATE),
    end_date: formatDate(seoulEvent.END_DATE),
    image_url: seoulEvent.MAIN_IMG || null,
    link_url: seoulEvent.ORG_LINK || null,
    contact_info: seoulEvent.ORG_NAME || null,
    is_featured: false,
    is_active: true,
  };
}

/**
 * 경기도 문화행사 정보 API
 */
const GYEONGGI_API_KEY = process.env.GYEONGGI_API_KEY || process.env.NEXT_PUBLIC_GYEONGGI_API_KEY;

export async function fetchGyeonggiEvents() {
  if (!GYEONGGI_API_KEY) {
    console.log('Gyeonggi API Key가 설정되지 않았습니다.');
    return [];
  }

  try {
    const url = `https://openapi.gg.go.kr/Genrestrtcltrevents?KEY=${GYEONGGI_API_KEY}&Type=json&pIndex=1&pSize=100`;
    
    console.log('Gyeonggi API 요청');

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Gyeonggi API 오류: ${response.status}`);
    }

    const data = await response.json();
    const items = data?.Genrestrtcltrevents?.[1]?.row;
    
    if (!items || items.length === 0) {
      console.log('Gyeonggi API 응답에 이벤트가 없습니다.');
      return [];
    }

    console.log(`Gyeonggi API에서 ${items.length}개의 행사 정보를 가져왔습니다.`);
    
    return items;
  } catch (error) {
    console.error('Gyeonggi API 호출 오류:', error);
    return [];
  }
}

