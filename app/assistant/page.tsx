import { requireAuth } from '@/lib/auth';
import LatteFriendClient from './LatteFriendClient';

export default async function AssistantPage() {
  await requireAuth();
  return <LatteFriendClient />;
}













