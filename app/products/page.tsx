import { requireAuth } from '@/lib/auth';
import Link from 'next/link';

export default async function ProductsPage() {
  const user = await requireAuth();

  console.log('🛍️ Products page - User:', user?.id);

  // 구독 체크 완전 제거 - 로그인만 하면 접근 가능

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-yellow-500 mb-2">구멍가게</h1>
        <p className="text-gray-600">
          추억의 레트로 제품을 만나보세요
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-6xl mb-4">🛍️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">준비 중입니다</h2>
        <p className="text-gray-600 mb-6">
          레트로 제품 판매 기능이 곧 출시됩니다.
        </p>
        <Link
          href="/"
          className="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}













