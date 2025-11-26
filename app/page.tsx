import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          빌구독에 오신 것을 환영합니다
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          레트로게임, 정보, 리뷰를 한 곳에서
        </p>
        <div className="space-x-4">
          <Link
            href="/pricing"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            구독 시작하기
          </Link>
          <Link
            href="/login"
            className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
