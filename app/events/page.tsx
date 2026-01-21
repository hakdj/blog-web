'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: 'festival' | 'local_feature' | 'local_ad' | 'other';
  region: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  image_url: string | null;
  link_url: string | null;
  contact_info: string | null;
  is_featured: boolean;
}

interface UserAd {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string;
  views: number;
  clicks: number;
  created_at: string;
  users?: {
    email: string;
  };
}

const REGIONS = [
  '전국',
  '서울',
  '부산',
  '경기',
  '인천',
  '대구',
  '대전',
  '광주',
  '울산',
  '세종',
  '강원',
  '충북',
  '충남',
  '전북',
  '전남',
  '경북',
  '경남',
  '제주',
];

const EVENT_TYPES = [
  { value: 'all', label: '전체', icon: '📋' },
  { value: 'festival', label: '축제', icon: '🎉' },
  { value: 'local_feature', label: '지역 특색', icon: '🏞️' },
  { value: 'ad', label: '광고', icon: '📢' },
];

const ITEMS_PER_PAGE = 24;
const REGION_ALIASES: Record<string, string> = {
  서울특별시: '서울',
  부산광역시: '부산',
  대구광역시: '대구',
  인천광역시: '인천',
  광주광역시: '광주',
  대전광역시: '대전',
  울산광역시: '울산',
  세종특별자치시: '세종',
  경기도: '경기',
  강원특별자치도: '강원',
  강원도: '강원',
  충청북도: '충북',
  충청남도: '충남',
  전라북도: '전북',
  전라남도: '전남',
  경상북도: '경북',
  경상남도: '경남',
  제주특별자치도: '제주',
  제주도: '제주',
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [ads, setAds] = useState<UserAd[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState('전국');
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const viewedAdIdsRef = useRef<Set<string>>(new Set());

  const supabase = createClient();

  useEffect(() => {
    loadEvents();
    loadAds();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, selectedRegion, selectedType, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRegion, selectedType, searchQuery]);

  // 광고 탭에서 "한 번만" 조회수 추적 (렌더링 중 setTimeout 생성 금지)
  useEffect(() => {
    if (selectedType !== 'ad') return;
    if (!ads || ads.length === 0) return;

    const idsToTrack = ads
      .map((a) => a.id)
      .filter((id) => id && !viewedAdIdsRef.current.has(id));

    if (idsToTrack.length === 0) return;

    const timer = setTimeout(() => {
      idsToTrack.forEach((id) => {
        viewedAdIdsRef.current.add(id);
        trackAdView(id);
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [selectedType, ads]);

  const loadEvents = async () => {
    try {
      // 오늘 날짜 (한국 시간 기준)
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .gte('end_date', today)   // 종료일이 오늘 이후 (아직 안 끝남)
        .order('start_date', { ascending: true }); // 시작일 빠른 순

      if (error) throw error;

      console.log('📊 이벤트 데이터:', data);
      console.log('📊 지역별 분포:', data?.reduce((acc: any, event) => {
        acc[event.region] = (acc[event.region] || 0) + 1;
        return acc;
      }, {}));
      console.log('📊 유형별 분포:', data?.reduce((acc: any, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      }, {}));

      setEvents(data || []);
    } catch (error) {
      console.error('이벤트 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAds = async () => {
    try {
      const response = await fetch('/api/ads');
      const data = await response.json();
      
      if (data.ads) {
        setAds(data.ads);
        console.log('📢 광고 데이터:', data.ads);
      }
    } catch (error) {
      console.error('광고 로딩 오류:', error);
    }
  };

  const handleAdClick = async (ad: UserAd) => {
    try {
      // 클릭 추적 (네비게이션/탭 이동을 막지 않도록 fire-and-forget)
      const payload = JSON.stringify({ ad_id: ad.id });
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        try {
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon('/api/ads/click', blob);
        } catch {
          fetch('/api/ads/click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        }
      } else {
        fetch('/api/ads/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }

      // 외부 링크로 이동
      window.open(ad.link_url, '_blank');
    } catch (error) {
      console.error('광고 클릭 처리 오류:', error);
      // 오류가 있어도 링크는 열기
      window.open(ad.link_url, '_blank');
    }
  };

  const trackAdView = (adId: string) => {
    try {
      const payload = JSON.stringify({ ad_id: adId });
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        try {
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon('/api/ads/view', blob);
        } catch {
          fetch('/api/ads/view', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        }
      } else {
        fetch('/api/ads/view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch (error) {
      console.error('광고 조회 추적 오류:', error);
    }
  };

  const filterEvents = () => {
    let filtered = [...events];

    // 지역 필터
    if (selectedRegion !== '전국') {
      filtered = filtered.filter((event) => {
        const raw = event.region || '';
        const normalized =
          REGION_ALIASES[raw] ||
          REGION_ALIASES[raw.split(' ')[0]] ||
          raw;
        if (normalized === selectedRegion) return true;
        const location = event.location || '';
        const token = location.split(' ')[0];
        const fromLocation = REGION_ALIASES[token] || token;
        return fromLocation === selectedRegion;
      });
    }

    // 유형 필터
    if (selectedType !== 'all') {
      filtered = filtered.filter((event) => event.event_type === selectedType);
    }

    // 검색어 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.location?.toLowerCase().includes(query)
      );
    }

    // 추천 이벤트를 먼저, 그 다음 날짜순으로 정렬
    filtered.sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    });

    setFilteredEvents(filtered);
  };

  const getEventTypeLabel = (type: string) => {
    const eventType = EVENT_TYPES.find((t) => t.value === type);
    return eventType ? eventType.label : type;
  };

  const getEventTypeIcon = (type: string) => {
    const eventType = EVENT_TYPES.find((t) => t.value === type);
    return eventType ? eventType.icon : '📅';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isUpcoming = (dateString: string) => {
    const eventDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate >= today;
  };

  const isOngoing = (startDate: string, endDate: string | null) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : start;
    return start <= today && end >= today;
  };

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / ITEMS_PER_PAGE));
  const pageStart = (currentPage - 1) * ITEMS_PER_PAGE;
  const pagedEvents = filteredEvents.slice(pageStart, pageStart + ITEMS_PER_PAGE);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">이벤트를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">요즘 뭐해?</h1>
        <p className="text-gray-600">
          전국 축제와 지역 일정을 확인하세요. 축제, 지역 특색, 지역 광고 정보를 제공합니다.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        {/* 검색 */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="이벤트명, 지역, 설명으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 지역 필터 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">지역</label>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map((region) => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedRegion === region
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {region}
              </button>
            ))}
          </div>
        </div>

        {/* 유형 필터 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">유형</label>
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  selectedType === type.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{type.icon}</span>
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-gray-600">
          총 <span className="font-semibold text-gray-900">{filteredEvents.length}개</span>의 이벤트가
          있습니다. (페이지 {currentPage}/{totalPages})
        </p>
      </div>

      {/* Events/Ads Grid */}
      {selectedType === 'ad' ? (
        // 광고 탭
        ads.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-5xl mb-4">📢</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">등록된 광고가 없습니다</h3>
            <p className="text-gray-600">유료 구독자가 광고를 등록하면 여기에 표시됩니다.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ads.map((ad) => {
              return (
                <div
                  key={ad.id}
                  onClick={() => handleAdClick(ad)}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all cursor-pointer border-2 border-purple-200 hover:border-purple-400"
                >
                  {ad.image_url && (
                    <div className="h-48 bg-gray-200 overflow-hidden">
                      <img
                        src={ad.image_url}
                        alt={ad.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">📢</span>
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                          광고
                        </span>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 mb-2">{ad.title}</h3>
                    {ad.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{ad.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-4 pt-4 border-t">
                      <div className="flex items-center gap-1">
                        <span>👁️</span>
                        <span>{ad.views.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>👆</span>
                        <span>{ad.clicks.toLocaleString()}</span>
                      </div>
                      {ad.views > 0 && (
                        <div className="text-xs text-gray-400">
                          클릭률 {((ad.clicks / ad.views) * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        // 일반 이벤트 탭
        filteredEvents.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-5xl mb-4">📅</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">이벤트가 없습니다</h3>
          <p className="text-gray-600">다른 필터 조건으로 검색해보세요.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pagedEvents.map((event) => (
            <div
              key={event.id}
              className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all ${
                event.is_featured ? 'ring-2 ring-yellow-400' : ''
              }`}
            >
              {event.image_url && (
                <div className="h-48 bg-gray-200 overflow-hidden">
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getEventTypeIcon(event.event_type)}</span>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {getEventTypeLabel(event.event_type)}
                    </span>
                    {event.is_featured && (
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                        추천
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2">{event.title}</h3>
                {event.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{event.description}</p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>📍</span>
                    <span>
                      {event.region}
                      {event.location && ` · ${event.location}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>📅</span>
                    <span>
                      {formatDate(event.start_date)}
                      {event.end_date && ` ~ ${formatDate(event.end_date)}`}
                    </span>
                  </div>
                  {isOngoing(event.start_date, event.end_date) && (
                    <span className="inline-block text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                      진행 중
                    </span>
                  )}
                  {!isOngoing(event.start_date, event.end_date) && isUpcoming(event.start_date) && (
                    <span className="inline-block text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      예정
                    </span>
                  )}
                </div>

                {event.link_url && (
                  <a
                    href={event.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block w-full text-center bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    자세히 보기 →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )
      )}

      {selectedType !== 'ad' && filteredEvents.length > 0 && totalPages > 1 && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 rounded border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            이전
          </button>
          {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-2 rounded border text-sm ${
                page === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}











