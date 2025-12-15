'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const ADMIN_EMAILS = ['hakdjhakdj@naver.com'];

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // 초기값을 false로 변경
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        // 프로필에서 닉네임 가져오기
        if (user) {
          // 관리자 체크
          const adminCheck = ADMIN_EMAILS.includes(user.email?.toLowerCase() || '');
          setIsAdmin(adminCheck);
          console.log('관리자 체크 (초기):', {
            email: user.email,
            isAdmin: adminCheck,
            adminEmails: ADMIN_EMAILS
          });
          
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
          setIsAdmin(false);
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
          // 관리자 체크
          const adminCheck = ADMIN_EMAILS.includes(session.user.email?.toLowerCase() || '');
          setIsAdmin(adminCheck);
          console.log('관리자 체크:', {
            email: session.user.email,
            isAdmin: adminCheck,
            adminEmails: ADMIN_EMAILS
          });
          
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
          setIsAdmin(false);
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
            라떼 방구석
          </Link>

          <nav className="flex items-center space-x-4">
            <Link
              href="/"
              className="text-gray-700 hover:text-gray-900 font-semibold px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              홈
            </Link>
            <Link
              href="/pricing"
              className="text-gray-700 hover:text-gray-900 font-semibold px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              가격
            </Link>

            {isLoading ? (
              <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
            ) : user ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-semibold text-gray-900 px-3 py-1.5 bg-gray-100 rounded-lg">
                    {nickname || user?.email?.split('@')[0] || '사용자'}
                  </span>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      관리자
                    </Link>
                  )}
                  <Link
                    href="/settings"
                    className="text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    설정
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/signup"
                  className="text-gray-700 hover:text-gray-900 font-semibold px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  회원가입
                </Link>
                <Link
                  href="/login"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
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

