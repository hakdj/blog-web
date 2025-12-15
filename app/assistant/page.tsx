import { requireAuth } from '@/lib/auth';
import Link from 'next/link';

export default async function AssistantPage() {
  await requireAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">라떼 친구</h1>
        <p className="text-gray-600">
          일정 관리 및 세부 취미 정보를 제공합니다
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-6xl mb-4">🤖</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">준비 중입니다</h2>
        <p className="text-gray-600 mb-6">
          개인 비서 기능이 곧 출시됩니다.
        </p>
        <Link
          href="/"
          className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

