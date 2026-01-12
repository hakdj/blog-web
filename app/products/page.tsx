import { requireAuth, getActiveSubscription } from '@/lib/auth';
import Link from 'next/link';

export default async function ProductsPage() {
  const user = await requireAuth();
  const subscription = await getActiveSubscription();

  console.log('🛍️ Products page - User:', user?.id);
  console.log('🛍️ Products page - Subscription:', subscription ? 'Active' : 'None');

  if (!subscription) {
    console.log('❌ No active subscription found, showing paywall');
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">구독이 필요합니다</h2>
          <p className="text-gray-600 mb-6">
            구멍가게에서 제품을 구매하려면 구독이 필요합니다.
          </p>
          <Link
            href="/pricing"
            className="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors"
          >
            구독하기
          </Link>
        </div>
      </div>
    );
  }

  console.log('✅ Active subscription found, showing products page');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">구멍가게</h1>
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













