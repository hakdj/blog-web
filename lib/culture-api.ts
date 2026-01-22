/**
 * 전국 박물관 미술관-공연행사 (KCISA)
 * https://api.kcisa.kr/openapi/API_CNV_066/request
 */

const CULTURE_API_KEY = process.env.CULTURE_API_KEY || process.env.NEXT_PUBLIC_CULTURE_API_KEY;
const CULTURE_API_BASE_URL = 'https://api.kcisa.kr/openapi/API_CNV_066/request';

function decodeXml(text: string) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function getXmlTag(block: string, tag: string) {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
  const m = block.match(re);
  return m ? decodeXml(m[1].trim()) : '';
}

export interface CultureEvent {
  museumNm?: string; // 박물관/미술관명
  museumRoadNmAddr?: string; // 박물관 도로명주소
  museumOperHmpgAddr?: string; // 박물관 홈페이지
  museumOperInstTelno?: string; // 박물관 운영기관 연락처
  museumMngInstTelno?: string; // 박물관 관리기관 연락처
  museumInfo?: string; // 박물관 정보
  museumSubInfo?: string; // 박물관 부가정보
  museumDataCtrlDt?: string; // 박물관 데이터기준일
  evntNm?: string; // 공연행사명
  evntPlcNm?: string; // 공연행사장소
  evntInfo?: string; // 공연행사정보 (기간 포함)
  evntSubInfo?: string; // 공연행사부가정보
  evntHmpgAddr?: string; // 공연행사홈페이지
  evntTelno?: string; // 공연행사전화번호
  evntRoadNmAddr?: string; // 공연행사도로명주소
  evntLatPos?: string; // 공연행사위도
  evntLotPos?: string; // 공연행사경도
  evntDataCrtlDt?: string; // 공연행사데이터기준일
}

/**
 * 현재 진행 중인 공연/전시 정보 가져오기
 */
export async function fetchCurrentCultureEvents(): Promise<CultureEvent[]> {
  if (!CULTURE_API_KEY) {
    // 동기화 화면에서 원인을 바로 보이게 하기 위해 "조용히 0건"으로 끝내지 않음
    throw new Error('Culture API Key가 설정되지 않았습니다. (CULTURE_API_KEY 또는 NEXT_PUBLIC_CULTURE_API_KEY)');
  }

  console.log('🔑 Culture(KCISA) API Key 확인: ', CULTURE_API_KEY ? '설정됨' : '없음');

  try {
    const PAGE_SIZE = 1000;

    const fetchPage = async (pageNo: number) => {
      const params = new URLSearchParams({
        serviceKey: CULTURE_API_KEY,
        numOfRows: String(PAGE_SIZE),
        pageNo: String(pageNo),
      });

      const url = `${CULTURE_API_BASE_URL}?${params.toString()}`;
      console.log(`🔍 Culture(KCISA) API 요청 URL 생성 완료 (page ${pageNo})`);

      const MAX_RETRIES = 3;
      let rawText = '';
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
          });

          console.log('📡 Culture(KCISA) API 응답 상태:', response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Culture API HTTP 오류: ${response.status}`);
            console.error('오류 내용:', errorText.substring(0, 200));
            throw new Error(`Culture API 오류: ${response.status}`);
          }

          rawText = await response.text();
          lastError = null;
          break;
        } catch (err) {
          lastError = err as Error;
          console.warn(`⚠️ Culture API 재시도 ${attempt}/${MAX_RETRIES}:`, lastError.message);
        }
      }

      if (!rawText && lastError) {
        throw lastError;
      }
      const trimmed = rawText.trim();
      const looksLikeXml = trimmed.startsWith('<');

      if (!looksLikeXml) {
        const data = JSON.parse(rawText);
        const header = data?.response?.header || data?.header || data?.msgHeader;
        const code = header?.resultCode || header?.code;
        const msg = header?.resultMsg || header?.message;
        if (code && code !== '0000') {
          throw new Error(`Culture API 오류: resultCode=${code} ${msg || ''}`.trim());
        }

        const items = data?.response?.body?.items?.item;
        const list = Array.isArray(items) ? items : items ? [items] : [];
        const totalCount = data?.response?.body?.totalCount;
        return { list, totalCount };
      }

      if (/<!doctype\s+html/i.test(trimmed) || /<html[\s>]/i.test(trimmed)) {
        const title = (trimmed.match(/<title>(.*?)<\/title>/i) || [])[1] || 'HTML';
        const snippet = trimmed.replace(/\s+/g, ' ').slice(0, 200);
        throw new Error(`Culture API 오류: HTML 에러페이지 응답 (${title}) - ${snippet}`);
      }

      const headerCode = getXmlTag(rawText, 'resultCode');
      const headerMsg = getXmlTag(rawText, 'resultMsg');
      if (headerCode && headerCode !== '0000') {
        throw new Error(`Culture API 오류: resultCode=${headerCode} ${headerMsg || ''}`.trim());
      }

      const blocks = rawText.match(/<item>[\s\S]*?<\/item>/g) || [];
      const parsed: CultureEvent[] = blocks.map((b) => ({
        museumNm: getXmlTag(b, 'museumNm'),
        museumRoadNmAddr: getXmlTag(b, 'museumRoadNmAddr'),
        museumOperHmpgAddr: getXmlTag(b, 'museumOperHmpgAddr'),
        museumOperInstTelno: getXmlTag(b, 'museumOperInstTelno'),
        museumMngInstTelno: getXmlTag(b, 'museumMngInstTelno'),
        museumInfo: getXmlTag(b, 'museumInfo'),
        museumSubInfo: getXmlTag(b, 'museumSubInfo'),
        museumDataCtrlDt: getXmlTag(b, 'museumDataCtrlDt'),
        evntNm: getXmlTag(b, 'evntNm'),
        evntPlcNm: getXmlTag(b, 'evntPlcNm'),
        evntInfo: getXmlTag(b, 'evntInfo'),
        evntSubInfo: getXmlTag(b, 'evntSubInfo'),
        evntHmpgAddr: getXmlTag(b, 'evntHmpgAddr'),
        evntTelno: getXmlTag(b, 'evntTelno'),
        evntRoadNmAddr: getXmlTag(b, 'evntRoadNmAddr'),
        evntLatPos: getXmlTag(b, 'evntLatPos'),
        evntLotPos: getXmlTag(b, 'evntLotPos'),
        evntDataCrtlDt: getXmlTag(b, 'evntDataCrtlDt'),
      }));

      const totalCountRaw = getXmlTag(rawText, 'totalCount');
      const totalCount = totalCountRaw ? Number(totalCountRaw) : undefined;
      return { list: parsed, totalCount };
    };

    const first = await fetchPage(1);
    const firstList = first.list || [];
    const totalCount = first.totalCount || firstList.length;
    if (firstList.length === 0) {
      console.warn('⚠️ Culture API 응답에 이벤트가 없습니다.');
      return [];
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const allItems = [...firstList];

    for (let page = 2; page <= totalPages; page += 1) {
      try {
        const { list } = await fetchPage(page);
        if (list.length === 0) break;
        allItems.push(...list);
      } catch (pageError) {
        console.error(`Culture API 페이지 ${page} 로딩 실패:`, pageError);
        // 전체 실패로 보이지 않도록, 이미 가져온 데이터는 유지하고 종료
        break;
      }
    }

    const filtered = allItems.filter((x) => x.evntNm || x.museumNm);
    console.log(`✅ Culture API에서 ${filtered.length}개의 원본 데이터 수신`);
    return filtered;
  } catch (error) {
    console.error('Culture API 호출 오류:', error);
    throw error;
  }
}

/**
 * Culture API 이벤트를 DB 형식으로 변환
 */
export function convertCultureEventToDbFormat(cultureEvent: CultureEvent) {
  const parseEventDates = (info?: string) => {
    if (!info) return { start: '', end: '' };
    const m = info.match(/(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/);
    if (m) return { start: m[1], end: m[2] };
    const single = info.match(/(\d{4}-\d{2}-\d{2})/);
    if (single) return { start: single[1], end: single[1] };
    return { start: '', end: '' };
  };

  const regionFromAddress = (addr?: string) => {
    if (!addr) return '전국';
    const token = addr.split(' ')[0];
    return token || '전국';
  };

  const dates = parseEventDates(cultureEvent.evntInfo);
  const fallbackDate = cultureEvent.evntDataCrtlDt || cultureEvent.museumDataCtrlDt || '';

  return {
    title: cultureEvent.evntNm || cultureEvent.museumNm || '행사 정보',
    description: [cultureEvent.evntInfo, cultureEvent.evntSubInfo, cultureEvent.museumInfo, cultureEvent.museumSubInfo]
      .filter(Boolean)
      .join('\n'),
    event_type: 'local_feature' as const,
    region: regionFromAddress(cultureEvent.evntRoadNmAddr || cultureEvent.museumRoadNmAddr),
    location: cultureEvent.evntRoadNmAddr || cultureEvent.museumRoadNmAddr || cultureEvent.evntPlcNm || '',
    start_date: dates.start || fallbackDate,
    end_date: dates.end || fallbackDate,
    image_url: null,
    link_url: cultureEvent.evntHmpgAddr || cultureEvent.museumOperHmpgAddr || null,
    contact_info:
      cultureEvent.evntTelno ||
      cultureEvent.museumOperInstTelno ||
      cultureEvent.museumMngInstTelno ||
      null,
    is_featured: false,
    is_active: true,
  };
}

