'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMode, setLoginMode] = useState<'password' | 'link'>('password'); // 'password' 또는 'link'
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // 이미 로그인된 사용자 확인 및 이메일 링크 처리
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // URL에 인증 토큰이 있는지 확인 (이메일 링크 클릭 시)
        // Hash fragment 확인
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hashAccessToken = hashParams.get('access_token');
        const hashRefreshToken = hashParams.get('refresh_token');
        
        // Query parameter 확인
        const queryToken = searchParams.get('token');
        const queryType = searchParams.get('type');

        // Hash fragment에 토큰이 있는 경우 (일반적인 Supabase 이메일 링크)
        if (hashAccessToken && hashRefreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          });

          if (!error) {
            // 세션 설정 후 대시보드로 이동
            router.push('/dashboard');
            return;
          }
        }

        // Query parameter에 토큰이 있는 경우
        if (queryToken) {
          // Supabase가 자동으로 처리할 수 있도록 기다림
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // 이미 로그인된 사용자인지 확인
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          router.push('/dashboard');
          return;
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router, supabase, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      if (loginMode === 'password') {
        // 이메일/비밀번호 로그인
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage('로그인 중 오류가 발생했습니다: ' + error.message);
        } else if (data.user) {
          router.push('/dashboard');
        }
      } else {
        // 이메일 링크 로그인
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });

        if (error) {
          setMessage('로그인 중 오류가 발생했습니다: ' + error.message);
        } else {
          setMessage('이메일로 로그인 링크를 보냈습니다. 이메일을 확인해주세요.');
        }
      }
    } catch (error) {
      setMessage('예상치 못한 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 인증 확인 중이면 로딩 표시
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            로그인
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {loginMode === 'password' ? '이메일과 비밀번호로 로그인하세요' : '이메일로 로그인 링크를 받으세요'}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="text-center">
            <Link href="/signup" className="text-sm text-blue-600 hover:text-blue-500">
              회원가입
            </Link>
          </div>

          {/* 로그인 방식 선택 토글 */}
          <div className="flex items-center justify-center space-x-4">
            <button
              type="button"
              onClick={() => setLoginMode('password')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                loginMode === 'password'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              비밀번호 로그인
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('link')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                loginMode === 'link'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              링크 로그인
            </button>
          </div>

          <div>
            <label htmlFor="email" className="sr-only">
              이메일 주소
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="이메일 주소"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {loginMode === 'password' && (
            <div>
              <label htmlFor="password" className="sr-only">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? '처리 중...' : loginMode === 'password' ? '로그인' : '로그인 링크 받기'}
            </button>
          </div>

          {message && (
            <div className={`text-sm text-center ${
              message.includes('오류') ? 'text-red-600' : 'text-green-600'
            }`}>
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

