'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check if we have a valid session or recovery token
    const checkSession = async () => {
      try {
        console.log('🔵 비밀번호 재설정 - 세션 확인 시작');
        
        // Check URL hash for recovery token
        if (typeof window !== 'undefined' && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const type = hashParams.get('type');
          
          console.log('🔵 URL 해시 확인:', { hasToken: !!accessToken, type });
          
          if (accessToken && type === 'recovery') {
            console.log('✅ 복구 토큰 발견');
            setHasValidSession(true);
            setCheckingSession(false);
            return;
          }
        }
        
        // Check current session
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('🔵 세션 확인:', { hasSession: !!session, error: error?.message });
        
        if (session) {
          console.log('✅ 유효한 세션 발견');
          setHasValidSession(true);
        } else {
          console.log('❌ 세션 없음');
          setMessage({ 
            type: 'error', 
            text: '유효하지 않은 비밀번호 재설정 링크입니다. 비밀번호 찾기를 다시 시도해주세요.' 
          });
        }
      } catch (error: any) {
        console.error('❌ 세션 확인 오류:', error);
        setMessage({ type: 'error', text: '세션 확인 중 오류가 발생했습니다.' });
      } finally {
        setCheckingSession(false);
      }
    };
    checkSession();
  }, [supabase]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (password !== confirmPassword) {
        setMessage({ type: 'error', text: '비밀번호가 일치하지 않습니다.' });
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setMessage({ type: 'error', text: '비밀번호는 최소 6자 이상이어야 합니다.' });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setMessage({ type: 'success', text: '비밀번호가 성공적으로 변경되었습니다. 로그인 페이지로 이동합니다...' });
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '비밀번호 변경에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking session
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">확인 중...</p>
        </div>
      </div>
    );
  }

  // Show error if no valid session
  if (!hasValidSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">비밀번호 재설정</h1>
          </div>
          <div className="mb-6 p-4 rounded-lg bg-red-100 text-red-800 border border-red-200">
            {message?.text || '유효하지 않은 비밀번호 재설정 링크입니다.'}
          </div>
          <div className="text-center space-y-2">
            <Link href="/forgot-password" className="block text-blue-600 hover:text-blue-700 text-sm">
              비밀번호 찾기 다시 시도
            </Link>
            <Link href="/login" className="block text-gray-600 hover:text-gray-700 text-sm">
              로그인 페이지로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">비밀번호 재설정</h1>
          <p className="text-gray-600">새로운 비밀번호를 입력해주세요.</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              새 비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="새 비밀번호 (최소 6자)"
              required
              minLength={6}
              disabled={loading || message?.type === 'success'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호 확인
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="비밀번호 확인"
              required
              minLength={6}
              disabled={loading || message?.type === 'success'}
            />
          </div>

          <button
            type="submit"
            disabled={loading || message?.type === 'success'}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-blue-600 hover:text-blue-700 text-sm">
            로그인 페이지로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}

