import { requireAuth } from '@/lib/auth';
import GameHubClient from './GameHubClient';

export default async function GamesPage() {
  await requireAuth();
  return <GameHubClient />;
}













