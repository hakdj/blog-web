import { requireAuth } from '@/lib/auth';
import DiaryClient from './DiaryClient';

export default async function DiaryPage() {
  await requireAuth();
  return <DiaryClient />;
}













