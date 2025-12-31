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

export interface GyeonggiEvent {
  FSTVL_NM?: string; // 축제명
  EVENT_NM?: string; // 행사명
  FSTVL_START_DATE?: string; // 축제시작일자
  FSTVL_END_DATE?: string; // 축제종료일자
  EVENT_START_DATE?: string; // 행사시작일자
  EVENT_END_DATE?: string; // 행사종료일자
  FSTVL_CO?: string; // 축제내용
  EVENT_CO?: string; // 행사내용
  AUSPC_INSTT_NM?: string; // 주최기관명
  MANAGE_INSTT_NM?: string; // 주관기관명
  SUPRT_INSTT_NM?: string; // 후원기관명
  PHONE_NUMBER?: string; // 전화번호
  HMPG_ADDR?: string; // 홈페이지주소
  RELATE_PLACE_NM?: string; // 관련장소명
  RELATE_PLACE_ADDR?: string; // 관련장소주소
  SIGUN_NM?: string; // 시군명
  REFINE_ROADNM_ADDR?: string; // 도로명주소
  REFINE_LOTNO_ADDR?: string; // 지번주소
  REFINE_ZIP_CD?: string; // 우편번호
  REFINE_WGS84_LAT?: string; // 위도
  REFINE_WGS84_LOGT?: string; // 경도
}

export async function fetchGyeonggiEvents(): Promise<GyeonggiEvent[]> {
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

    // 현재 진행 중이거나 예정된 이벤트만 필터링
    const today = new Date();
    const currentEvents = items.filter((event: GyeonggiEvent) => {
      const endDateStr = event.FSTVL_END_DATE || event.EVENT_END_DATE;
      if (!endDateStr) return false;
      
      try {
        const endDate = parseGyeonggiDate(endDateStr);
        return endDate >= today;
      } catch {
        return false;
      }
    });

    console.log(`Gyeonggi API에서 ${currentEvents.length}개의 행사 정보를 가져왔습니다.`);
    
    return currentEvents;
  } catch (error) {
    console.error('Gyeonggi API 호출 오류:', error);
    return [];
  }
}

/**
 * 경기도 날짜 형식 파싱 (YYYYMMDD 또는 YYYY-MM-DD)
 */
function parseGyeonggiDate(dateStr: string): Date {
  if (!dateStr) throw new Error('Invalid date');
  
  // 하이픈 제거
  const cleanDate = dateStr.replace(/-/g, '');
  
  if (cleanDate.length !== 8) throw new Error('Invalid date format');
  
  const year = parseInt(cleanDate.slice(0, 4));
  const month = parseInt(cleanDate.slice(4, 6)) - 1; // JS Date는 0부터 시작
  const day = parseInt(cleanDate.slice(6, 8));
  
  return new Date(year, month, day);
}

/**
 * Gyeonggi API 이벤트를 DB 형식으로 변환
 */
export function convertGyeonggiEventToDbFormat(gyeonggiEvent: GyeonggiEvent) {
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    // YYYYMMDD -> YYYY-MM-DD
    const cleanDate = dateStr.replace(/-/g, '');
    if (cleanDate.length !== 8) return '';
    return `${cleanDate.slice(0, 4)}-${cleanDate.slice(4, 6)}-${cleanDate.slice(6, 8)}`;
  };

  // 축제명 또는 행사명
  const title = gyeonggiEvent.FSTVL_NM || gyeonggiEvent.EVENT_NM || '제목 없음';
  
  // 축제내용 또는 행사내용
  const description = gyeonggiEvent.FSTVL_CO || gyeonggiEvent.EVENT_CO || '';
  
  // 시작일/종료일 (축제 우선, 없으면 행사)
  const startDate = formatDate(gyeonggiEvent.FSTVL_START_DATE || gyeonggiEvent.EVENT_START_DATE);
  const endDate = formatDate(gyeonggiEvent.FSTVL_END_DATE || gyeonggiEvent.EVENT_END_DATE);
  
  // 장소 정보
  const location = gyeonggiEvent.RELATE_PLACE_NM || 
                   gyeonggiEvent.REFINE_ROADNM_ADDR || 
                   gyeonggiEvent.REFINE_LOTNO_ADDR || 
                   gyeonggiEvent.SIGUN_NM || 
                   '';
  
  // 연락처 정보
  const contactInfo = [
    gyeonggiEvent.AUSPC_INSTT_NM,
    gyeonggiEvent.PHONE_NUMBER
  ].filter(Boolean).join(' / ');

  return {
    title: title,
    description: description,
    event_type: 'festival' as const, // 경기도는 주로 축제/행사
    region: '경기',
    location: location,
    start_date: startDate,
    end_date: endDate,
    image_url: null, // 경기도 API는 이미지 제공 안 함
    link_url: gyeonggiEvent.HMPG_ADDR || null,
    contact_info: contactInfo || null,
    is_featured: false,
    is_active: true,
  };
}

