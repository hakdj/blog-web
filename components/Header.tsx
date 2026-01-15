'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // Check if user has active subscription
      if (user) {
        const { data: subscriptions } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .gt('current_period_end', new Date().toISOString());
        
        setHasActiveSubscription(Boolean(subscriptions && subscriptions.length > 0));
      }
      
      setIsLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        // Check subscription when auth state changes
        if (session?.user) {
          const { data: subscriptions } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('status', 'active')
            .gt('current_period_end', new Date().toISOString());
          
          setHasActiveSubscription(Boolean(subscriptions && subscriptions.length > 0));
        } else {
          setHasActiveSubscription(false);
        }
        
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-gray-900">
            구독형 블로그
          </Link>

          <nav className="flex items-center space-x-6">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              홈
            </Link>
            <Link
              href="/pricing"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              구독신청
            </Link>

            {isLoading ? (
              <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
            ) : user ? (
              <div className="flex items-center space-x-4">
                {hasActiveSubscription && (
                  <Link
                    href="/ads"
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    광고 등록
                  </Link>
                )}
                <Link
                  href="/settings"
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  마이페이지
                </Link>
                {['hakdjhakdj@naver.com', 'hakdjhakdj@gmail.com'].includes(user.email || '') && (
                  <Link
                    href="/admin"
                    className="text-purple-600 hover:text-purple-800 font-bold"
                  >
                    관리자
                  </Link>
                )}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                  >
                    로그아웃
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/signup"
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  회원가입
                </Link>
                <Link
                  href="/login"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  로그인
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

