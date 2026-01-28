/**
 * 한국관광공사 Tour API 연동
 * https://api.visitkorea.or.kr
 */

const TOUR_API_KEY = process.env.TOUR_API_KEY || process.env.NEXT_PUBLIC_TOUR_API_KEY;
// 공공데이터포털 기준 Endpoint (KorService2)
const TOUR_API_BASE_URL = 'https://apis.data.go.kr/B551011/KorService2';

function formatServiceKey(key: string) {
  // data.go.kr 키는 종종 이미 %2F 같은 형태로 인코딩되어 저장됨
  // URLSearchParams로 다시 인코딩하면 %가 %25로 변해 인증 실패 가능
  const alreadyEncoded = key.includes('%');
  return alreadyEncoded ? key : encodeURIComponent(key);
}

async function fetchWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    return await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Tour Sync)',
      },
      cache: 'no-store',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJsonWithRetries(url: string, retries = 3) {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url);
      return response;
    } catch (err) {
      lastError = err as Error;
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }
  throw lastError || new Error('Tour API 네트워크 오류');
}

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

export const TOUR_AREA_CODES = Object.keys(AREA_CODE_MAP);

export interface TourFetchOptions {
  fallbackMode?: 'none' | 'area';
  fallbackStartIndex?: number;
  fallbackMaxAreas?: number;
}

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
export async function fetchCurrentFestivals(options: TourFetchOptions = {}): Promise<TourEvent[]> {
  if (!TOUR_API_KEY) {
    // 동기화 화면에서 원인을 바로 보이게 하기 위해 "조용히 0건"으로 끝내지 않음
    throw new Error('Tour API Key가 설정되지 않았습니다. (TOUR_API_KEY 또는 NEXT_PUBLIC_TOUR_API_KEY)');
  }

  try {
    const today = new Date();
    const eventStartDate = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const futureDate = new Date(today);
    futureDate.setMonth(futureDate.getMonth() + 3);
    const eventEndDate = futureDate.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    
    const serviceKeyEncoded = formatServiceKey(TOUR_API_KEY);
    const serviceKeyRaw = TOUR_API_KEY;
    const params = new URLSearchParams({
      numOfRows: '100',
      pageNo: '1',
      MobileOS: 'ETC',
      MobileApp: 'LatteBanggusuk',
      _type: 'json',
      listYN: 'Y',
      arrange: 'A', // 제목순
      eventStartDate: eventStartDate,
      eventEndDate: eventEndDate,
    });

    const keysToTry = Array.from(new Set([serviceKeyEncoded, serviceKeyRaw])).filter(Boolean);
    const baseUrls = [
      `${TOUR_API_BASE_URL}/searchFestival1`,
      'https://apis.data.go.kr/B551011/KorService1/searchFestival1',
      'https://apis.data.go.kr/B551011/KorService/searchFestival1',
      'https://apis.data.go.kr/B551011/KorService/searchFestival',
    ];

    // 일부 환경에서 서비스 버전/키 인코딩 조합에 따라 500이 발생할 수 있어 폴백을 둠
    const candidateUrls: string[] = [];
    baseUrls.forEach((base) => {
      keysToTry.forEach((key) => {
        candidateUrls.push(`${base}?serviceKey=${key}&${params.toString()}`);
      });
    });

    let lastError: string | null = null;
    for (const url of candidateUrls) {
      console.log('🔍 Tour API 요청 URL 생성 완료');

      let response: Response | null = null;
      try {
        response = await fetchJsonWithRetries(url, 3);
      } catch (err) {
        lastError = `Tour API 네트워크 오류: ${(err as Error).message}`;
        continue;
      }

      if (!response) {
        continue;
      }

      console.log('📡 Tour API 응답 상태:', response.status);

      // 500 등 비정상은 다음 후보로 폴백
      if (!response.ok) {
        const errorText = await response.text();
        lastError = `Tour API 오류: ${response.status} - ${errorText.substring(0, 200)}`.trim();
        continue;
      }

      const data = await response.json();
      console.log('📦 Tour API 응답 구조:', Object.keys(data));

      const resultCode = data?.response?.header?.resultCode;
      const resultMsg = data?.response?.header?.resultMsg;
      if (resultCode && resultCode !== '0000') {
        lastError = `Tour API 오류: resultCode=${resultCode} ${resultMsg || ''}`.trim();
        continue;
      }

      // API 응답 구조 확인
      const items = data?.response?.body?.items?.item;
    
      if (!items) {
        // 정상 응답인데 items가 비어있으면 그건 "0건"이므로 여기서 종료
        console.warn('⚠️ Tour API 응답에 이벤트가 없습니다.');
        console.log('📦 응답 body:', data?.response?.body);
        return [];
      }

      console.log(`✅ Tour API에서 ${Array.isArray(items) ? items.length : 1}개의 원본 데이터 수신`);

      // 배열이 아닌 경우 배열로 변환
      const eventList = Array.isArray(items) ? items : [items];

      console.log(`Tour API에서 ${eventList.length}개의 축제 정보를 가져왔습니다.`);
      return eventList;
    }

    if (options.fallbackMode === 'area') {
      // 전체 호출이 실패하면 지역별로 분산 호출 (짧은 배치로만 실행)
      const aggregated: TourEvent[] = [];
      const seen = new Set<string>();
      let areaFailures = 0;
      const startIndex = Number.isFinite(options.fallbackStartIndex)
        ? Math.max(0, options.fallbackStartIndex as number)
        : 0;
      const maxAreas = Number.isFinite(options.fallbackMaxAreas)
        ? Math.max(1, options.fallbackMaxAreas as number)
        : TOUR_AREA_CODES.length;
      const endIndex = Math.min(startIndex + maxAreas, TOUR_AREA_CODES.length);

      for (let i = startIndex; i < endIndex; i += 1) {
        const code = TOUR_AREA_CODES[i];
        try {
          const list = await fetchFestivalsByArea(code);
          list.forEach((item) => {
            const key = `${item.contentid}-${item.eventstartdate || ''}`;
            if (!seen.has(key)) {
              seen.add(key);
              aggregated.push(item);
            }
          });
        } catch {
          areaFailures += 1;
        }
        await new Promise((resolve) => setTimeout(resolve, 120));
      }

      if (aggregated.length > 0) {
        console.warn(`⚠️ Tour API 전체 실패로 지역별 폴백 사용 (실패 ${areaFailures}개)`);
        return aggregated;
      }
    }

    throw new Error(lastError || 'Tour API 오류: 알 수 없는 오류');
  } catch (error) {
    console.error('Tour API 호출 오류:', error);
    throw error;
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
    throw new Error('Tour API Key가 설정되지 않았습니다. (TOUR_API_KEY 또는 NEXT_PUBLIC_TOUR_API_KEY)');
  }

  try {
    const today = new Date();
    const eventStartDate = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const futureDate = new Date(today);
    futureDate.setMonth(futureDate.getMonth() + 3);
    const eventEndDate = futureDate.toISOString().slice(0, 10).replace(/-/g, '');

    const serviceKeyEncoded = formatServiceKey(TOUR_API_KEY);
    const serviceKeyRaw = TOUR_API_KEY;
    const params = new URLSearchParams({
      numOfRows: '50',
      pageNo: '1',
      MobileOS: 'ETC',
      MobileApp: 'LatteBanggusuk',
      _type: 'json',
      listYN: 'Y',
      arrange: 'A',
      areaCode: areaCode,
      eventStartDate: eventStartDate,
      eventEndDate: eventEndDate,
    });

    const urls = Array.from(new Set([
      `${TOUR_API_BASE_URL}/searchFestival1?serviceKey=${serviceKeyEncoded}&${params.toString()}`,
      `${TOUR_API_BASE_URL}/searchFestival1?serviceKey=${serviceKeyRaw}&${params.toString()}`,
    ]));

    let data: any = null;
    let lastError: string | null = null;
    for (const url of urls) {
      try {
        const response = await fetchJsonWithRetries(url, 3);
        if (!response.ok) {
          const errorText = await response.text();
          lastError = `Tour API 오류: ${response.status} - ${errorText.substring(0, 200)}`.trim();
          continue;
        }
        data = await response.json();
        break;
      } catch (err) {
        lastError = `Tour API 네트워크 오류: ${(err as Error).message}`;
      }
    }

    if (!data) {
      throw new Error(lastError || 'Tour API 오류: 알 수 없는 오류');
    }
    const items = data?.response?.body?.items?.item;
    
    if (!items) return [];

    return Array.isArray(items) ? items : [items];
  } catch (error) {
    console.error('Tour API 호출 오류:', error);
    throw error;
  }
}

