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
    const maxRows = Number(process.env.SEOUL_MAX_ROWS || 500);
    const safeRows = Number.isFinite(maxRows) ? Math.max(1, maxRows) : 500;
    const url = `${SEOUL_API_BASE_URL}/${SEOUL_API_KEY}/json/culturalEventInfo/1/${safeRows}/`;
    
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
 *
 * 기존 openapi.gg.go.kr 서비스명은 ERROR-310(서비스 없음) 응답이 발생할 수 있어
 * 경기문화재단 지지씨(ggc.ggcf.kr) OpenAPI(playongoing)로 연동합니다.
 */
const GYEONGGI_API_KEY = process.env.GYEONGGI_API_KEY || process.env.NEXT_PUBLIC_GYEONGGI_API_KEY;
const GYEONGGI_GGC_BASE_URL = 'https://ggc.ggcf.kr/open/json/playongoing';

export interface GyeonggiEvent {
  INST_NM?: string; // 기관명(writer)
  TITLE_NM?: string; // 제목(subject)
  CLASS_NM?: string; // 분류명(category)
  ADDR?: string; // 주소(address)
  TM?: string; // 시간(intime)
  EXPN?: string; // 비용(incost)
  TELNO?: string; // 문의(inquiry)
  MNGT_NM?: string; // 주최/주관(inarea)
  HMPG_NM?: string; // 홈페이지(homepage)
  PARTCPTN_WRITR_NM?: string; // 참여작가/기타(members)
  IMAGE_URL_NM?: string; // 이미지 URL(thumbnail)
  BGNG_DE?: string; // 시작일(startdate)
  END_DE?: string; // 종료일(enddate)
  URL_NM?: string; // 자세히 보기 URL(href)
}

export async function fetchGyeonggiEvents(): Promise<GyeonggiEvent[]> {
  if (!GYEONGGI_API_KEY) {
    console.error('❌ Gyeonggi API Key가 설정되지 않았습니다.');
    return [];
  }

  try {
    const params = new URLSearchParams({
      KEY: GYEONGGI_API_KEY,
      page: '0',
      perpage: '100',
    });

    const url = `${GYEONGGI_GGC_BASE_URL}?${params.toString()}`;
    console.log('🔍 Gyeonggi(GGC) API 요청:', url.replace(GYEONGGI_API_KEY, 'API_KEY_HIDDEN'));

    const response = await fetch(url, { method: 'GET' });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gyeonggi(GGC) API 오류: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    const info = data?.INFO;
    if (typeof info !== 'undefined' && info !== 0) {
      // INFO: 0 정상
      throw new Error(`Gyeonggi(GGC) API 오류: INFO=${info}`);
    }

    const rows = data?.DATA;
    const items = Array.isArray(rows) ? rows : [];
    
    if (!items || items.length === 0) {
      console.warn('⚠️ Gyeonggi API 응답에 이벤트가 없습니다.');
      console.log('📦 전체 응답:', JSON.stringify(data).substring(0, 500));
      return [];
    }

    console.log(`✅ Gyeonggi(GGC) API에서 ${items.length}개의 원본 데이터 수신`);

    // 현재 진행 중이거나 예정된 이벤트만 필터링
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentEvents = items
      .map((row: any): GyeonggiEvent => ({
        INST_NM: row.writer,
        TITLE_NM: row.subject,
        CLASS_NM: row.category,
        ADDR: row.address,
        TM: row.intime,
        EXPN: row.incost,
        TELNO: row.inquiry,
        MNGT_NM: row.inarea,
        HMPG_NM: row.homepage,
        PARTCPTN_WRITR_NM: row.members,
        IMAGE_URL_NM: row.thumbnail,
        BGNG_DE: row.startdate,
        // enddate 키가 'enddate:' 로 올 수도 있어 방어
        END_DE: row.enddate || row['enddate:'],
        URL_NM: row.href,
      }))
      .filter((event: GyeonggiEvent) => {
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
    throw error;
  }
}

/**
 * 경기도 날짜 형식 파싱 (YYYYMMDD 또는 YYYY-MM-DD)
 */
function parseGyeonggiDate(dateStr: string): Date {
  if (!dateStr) throw new Error('Invalid date');
  
  // YYYY-MM-DD / YYYYMMDD / YYYY-MM-DD HH:mm:ss 등 대응
  const m = dateStr.match(/(\d{4})\D?(\d{2})\D?(\d{2})/);
  if (!m) throw new Error('Invalid date format');

  const year = parseInt(m[1]);
  const month = parseInt(m[2]) - 1;
  const day = parseInt(m[3]);
  
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

