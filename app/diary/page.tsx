import { requireAuth, getActiveSubscription } from '@/lib/auth';
import DiaryClient from './DiaryClient';

export default async function DiaryPage() {
  await requireAuth();
  const subscription = await getActiveSubscription();
  const isPremium = !!subscription;

  return <DiaryClient isPremium={isPremium} />;
}













