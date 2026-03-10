import { getActiveSubscription, isAdmin, requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ProductsClient from './ProductsClient';

export default async function ProductsPage() {
  const user = await requireAuth();
  const adminUser = isAdmin(user);
  if (!adminUser) {
    const subscription = await getActiveSubscription();
    if (!subscription) {
      redirect('/pricing');
    }
  }
  return <ProductsClient canManage={adminUser} />;
}













