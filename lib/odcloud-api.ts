/**
 * 공공데이터포털(ODCloud) 전국 표준데이터 연동
 * 예: 전국문화축제표준데이터, 전국공연행사정보표준데이터
 */

const ODCLOUD_API_KEY =
  process.env.ODCLOUD_API_KEY ||
  process.env.TOUR_API_KEY ||
  process.env.NEXT_PUBLIC_TOUR_API_KEY;

const ODCLOUD_FESTIVAL_URL = process.env.ODCLOUD_FESTIVAL_URL;
const ODCLOUD_PERFORMANCE_URL = process.env.ODCLOUD_PERFORMANCE_URL;

export interface OdcloudFetchOptions {
  pageSize?: number;
  maxPages?: number;
  maxItems?: number;
}

type OdcloudRow = Record<string, string | number | null | undefined>;

function formatServiceKey(key: string) {
  const alreadyEncoded = key.includes('%');
  return alreadyEncoded ? key : encodeURIComponent(key);
}

function normalizeDate(value?: string | number | null) {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';

  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }

  const parts = raw.split(/[.\-/]/).map((p) => p.trim());
  if (parts.length >= 3) {
    const [y, m, d] = parts;
    if (y && m && d) {
      return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  return raw.length >= 10 ? raw.slice(0, 10) : raw;
}

function extractField(row: OdcloudRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

function regionFromAddress(address: string) {
  if (!address) return '전국';
  const token = address.split(' ')[0];
  return token || '전국';
}

async function fetchOdcloudRows(
  baseUrl: string,
  options: OdcloudFetchOptions = {}
): Promise<OdcloudRow[]> {
  if (!ODCLOUD_API_KEY) {
    throw new Error('ODCloud API Key가 설정되지 않았습니다. (ODCLOUD_API_KEY)');
  }

  const pageSizeEnv = Number(process.env.ODCLOUD_PAGE_SIZE || 300);
  const pageSize = Number.isFinite(options.pageSize) ? Math.max(1, options.pageSize as number) : pageSizeEnv;
  const maxPagesEnv = Number(process.env.ODCLOUD_MAX_PAGES || 2);
  const maxPages = Number.isFinite(options.maxPages) ? Math.max(1, options.maxPages as number) : maxPagesEnv;
  const maxItemsEnv = Number(process.env.ODCLOUD_MAX_ITEMS || 1000);
  const maxItems = Number.isFinite(options.maxItems) ? Math.max(1, options.maxItems as number) : maxItemsEnv;

  const serviceKey = formatServiceKey(ODCLOUD_API_KEY);
  const allItems: OdcloudRow[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const url = new URL(baseUrl);
    if (!url.searchParams.has('serviceKey')) {
      url.searchParams.set('serviceKey', serviceKey);
    }
    if (!url.searchParams.has('perPage')) {
      url.searchParams.set('perPage', String(pageSize));
    }
    if (!url.searchParams.has('page')) {
      url.searchParams.set('page', String(page));
    } else {
      url.searchParams.set('page', String(page));
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ODCloud API 오류: ${response.status} - ${errorText.substring(0, 200)}`);
    }
    const data = await response.json();
    const items = Array.isArray(data?.data) ? data.data : [];
    if (items.length === 0) break;
    allItems.push(...items);
    if (allItems.length >= maxItems) break;
    const totalCount = Number(data?.totalCount || 0);
    if (totalCount && page * pageSize >= totalCount) break;
  }

  return allItems.slice(0, maxItems);
}

export async function fetchOdcloudFestivals(options: OdcloudFetchOptions = {}) {
  if (!ODCLOUD_FESTIVAL_URL) {
    throw new Error('ODCLOUD_FESTIVAL_URL이 설정되지 않았습니다.');
  }
  return fetchOdcloudRows(ODCLOUD_FESTIVAL_URL, options);
}

export async function fetchOdcloudPerformances(options: OdcloudFetchOptions = {}) {
  if (!ODCLOUD_PERFORMANCE_URL) {
    throw new Error('ODCLOUD_PERFORMANCE_URL이 설정되지 않았습니다.');
  }
  return fetchOdcloudRows(ODCLOUD_PERFORMANCE_URL, options);
}

export function convertOdcloudFestivalToDbFormat(row: OdcloudRow) {
  const title = extractField(row, ['축제명', '행사명', '행사명(축제명)', '축제']);
  const start = normalizeDate(extractField(row, ['축제시작일자', '행사시작일자', '시작일', '시작일자']));
  const end = normalizeDate(extractField(row, ['축제종료일자', '행사종료일자', '종료일', '종료일자']));
  const address =
    extractField(row, ['소재지도로명주소', '도로명주소', '소재지지번주소', '지번주소', '주소']) ||
    extractField(row, ['개최장소', '행사장소', '장소']);

  return {
    title: title || '축제 정보',
    description: extractField(row, ['축제내용', '행사내용', '행사설명', '내용']),
    event_type: 'festival' as const,
    region: regionFromAddress(address),
    location: address || extractField(row, ['개최장소', '행사장소', '장소']),
    start_date: start,
    end_date: end || start,
    image_url: null,
    link_url: extractField(row, ['홈페이지주소', '관련정보', '홈페이지']),
    contact_info: extractField(row, ['전화번호', '문의전화', '전화']),
    is_featured: false,
    is_active: true,
  };
}

export function convertOdcloudPerformanceToDbFormat(row: OdcloudRow) {
  const title = extractField(row, ['행사명', '공연명', '공연행사명', '행사']);
  const start = normalizeDate(extractField(row, ['행사시작일자', '공연시작일자', '시작일', '시작일자']));
  const end = normalizeDate(extractField(row, ['행사종료일자', '공연종료일자', '종료일', '종료일자']));
  const address =
    extractField(row, ['소재지도로명주소', '도로명주소', '소재지지번주소', '지번주소', '주소']) ||
    extractField(row, ['행사장소', '공연장소', '장소']);

  return {
    title: title || '공연/행사 정보',
    description: extractField(row, ['행사내용', '공연내용', '행사설명', '내용']),
    event_type: 'local_feature' as const,
    region: regionFromAddress(address),
    location: address || extractField(row, ['행사장소', '공연장소', '장소']),
    start_date: start,
    end_date: end || start,
    image_url: null,
    link_url: extractField(row, ['홈페이지주소', '관련정보', '홈페이지']),
    contact_info: extractField(row, ['전화번호', '문의전화', '전화']),
    is_featured: false,
    is_active: true,
  };
}
