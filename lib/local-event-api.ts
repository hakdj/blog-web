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
  INST_NM?: string; // 기관명
  TITLE_NM?: string; // 제목
  CLASS_NM?: string; // 분류명
  ADDR?: string; // 주소
  TM?: string; // 시간
  EXPN?: string; // 비용
  TELNO?: string; // 문의할 연락처
  MNGT_NM?: string; // 주최 주관
  HMPG_NM?: string; // 홈페이지
  PARTCPTN_WRITR_NM?: string; // 참여작가
  IMAGE_URL_NM?: string; // 이미지 URL
  BGNG_DE?: string; // 시작일
  END_DE?: string; // 종료일
  URL_NM?: string; // 자세히 보기 URL
}

export async function fetchGyeonggiEvents(): Promise<GyeonggiEvent[]> {
  if (!GYEONGGI_API_KEY) {
    console.error('❌ Gyeonggi API Key가 설정되지 않았습니다.');
    return [];
  }

  try {
    const url = `https://openapi.gg.go.kr/GgCultEvnt?KEY=${GYEONGGI_API_KEY}&Type=json&pIndex=1&pSize=100`;
    
    console.log('🔍 Gyeonggi API 요청:', url.replace(GYEONGGI_API_KEY, 'API_KEY_HIDDEN'));

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`❌ Gyeonggi API HTTP 오류: ${response.status}`);
      throw new Error(`Gyeonggi API 오류: ${response.status}`);
    }

    const data = await response.json();
    console.log('📦 Gyeonggi API 응답 구조:', Object.keys(data));
    console.log('📦 GgCultEvnt:', data?.GgCultEvnt ? 'exists' : 'missing');
    
    const items = data?.GgCultEvnt?.[1]?.row;
    
    if (!items || items.length === 0) {
      console.warn('⚠️ Gyeonggi API 응답에 이벤트가 없습니다.');
      console.log('📦 전체 응답:', JSON.stringify(data).substring(0, 500));
      return [];
    }

    console.log(`✅ Gyeonggi API에서 ${items.length}개의 원본 데이터 수신`);

    // 현재 진행 중이거나 예정된 이벤트만 필터링
    const today = new Date();
    const currentEvents = items.filter((event: GyeonggiEvent) => {
      const endDateStr = event.END_DE;
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

  // 제목
  const title = gyeonggiEvent.TITLE_NM || '제목 없음';
  
  // 설명 (분류명 + 기관명)
  const description = [
    gyeonggiEvent.CLASS_NM,
    gyeonggiEvent.INST_NM,
    gyeonggiEvent.EXPN ? `비용: ${gyeonggiEvent.EXPN}` : null,
  ].filter(Boolean).join(' / ');
  
  // 시작일/종료일
  const startDate = formatDate(gyeonggiEvent.BGNG_DE);
  const endDate = formatDate(gyeonggiEvent.END_DE);
  
  // 장소 정보
  const location = gyeonggiEvent.ADDR || '';
  
  // 연락처 정보
  const contactInfo = [
    gyeonggiEvent.MNGT_NM,
    gyeonggiEvent.TELNO
  ].filter(Boolean).join(' / ');

  return {
    title: title,
    description: description,
    event_type: 'festival' as const, // 경기도는 주로 축제/행사
    region: '경기',
    location: location,
    start_date: startDate,
    end_date: endDate,
    image_url: gyeonggiEvent.IMAGE_URL_NM || null,
    link_url: gyeonggiEvent.URL_NM || gyeonggiEvent.HMPG_NM || null,
    contact_info: contactInfo || null,
    is_featured: false,
    is_active: true,
  };
}

