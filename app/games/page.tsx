import { requireSubscription } from '@/lib/auth';
import GameHubClient from './GameHubClient';

export default async function GamesPage() {
  await requireSubscription();
  return <GameHubClient />;
}













