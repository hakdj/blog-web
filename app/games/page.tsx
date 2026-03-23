import { requireAuth, getActiveSubscription } from '@/lib/auth';
import GameHubClient from './GameHubClient';

export default async function GamesPage() {
  await requireAuth();
  const subscription = await getActiveSubscription();
  const isPremium = !!subscription;

  return <GameHubClient isPremium={isPremium} />;
}













