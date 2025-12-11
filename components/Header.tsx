'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // 초기값을 false로 변경
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        // 프로필에서 닉네임 가져오기
        if (user) {
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('nickname')
              .eq('id', user.id)
              .single();
            
            if (error) {
              console.error('프로필 가져오기 오류:', error);
              setNickname(null);
            } else {
              setNickname(profile?.nickname || null);
            }
          } catch (err) {
            console.error('프로필 조회 중 예외:', err);
            setNickname(null);
          }
        } else {
          setNickname(null);
        }
      } catch (error) {
        // 에러 발생해도 사용자는 null로 설정하고 계속 진행
        setUser(null);
        setNickname(null);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        // 프로필에서 닉네임 가져오기
        if (session?.user) {
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('nickname')
              .eq('id', session.user.id)
              .single();
            
            if (error) {
              console.error('프로필 가져오기 오류:', error);
              setNickname(null);
            } else {
              setNickname(profile?.nickname || null);
            }
          } catch (err) {
            console.error('프로필 조회 중 예외:', err);
            setNickname(null);
          }
        } else {
          setNickname(null);
        }
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
            빌구독
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
              가격
            </Link>

            {isLoading ? (
              <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
            ) : user ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {nickname || user?.email?.split('@')[0] || '사용자'}
                  </span>
                  <Link
                    href="/settings"
                    className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                  >
                    설정
                  </Link>
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

