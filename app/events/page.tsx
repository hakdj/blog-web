'use client';

import { useState, useEffect } from 'react';
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
  { value: 'local_ad', label: '지역 광고', icon: '📢' },
];

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState('전국');
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const supabase = createClient();

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, selectedRegion, selectedType, searchQuery]);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .order('start_date', { ascending: true });

      if (error) throw error;

      setEvents(data || []);
    } catch (error) {
      console.error('이벤트 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = [...events];

    // 지역 필터
    if (selectedRegion !== '전국') {
      filtered = filtered.filter((event) => event.region === selectedRegion);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">이벤트 일정</h1>
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
          있습니다.
        </p>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-5xl mb-4">📅</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">이벤트가 없습니다</h3>
          <p className="text-gray-600">다른 필터 조건으로 검색해보세요.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
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
      )}
    </div>
  );
}
