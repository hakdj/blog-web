import { requireSubscription } from '@/lib/auth';
import LatteFriendClient from './LatteFriendClient';

export default async function AssistantPage() {
  await requireSubscription();
  return <LatteFriendClient />;
}













