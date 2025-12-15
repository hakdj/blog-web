'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    // 비밀번호 확인
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      setIsLoading(false);
      return;
    }

    // 비밀번호 길이 확인
    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      setIsLoading(false);
      return;
    }

    // 닉네임 확인
    if (!nickname || nickname.trim().length === 0) {
      setError('닉네임을 입력해주세요.');
      setIsLoading(false);
      return;
    }

    if (nickname.trim().length < 2) {
      setError('닉네임은 최소 2자 이상이어야 합니다.');
      setIsLoading(false);
      return;
    }

    try {
      // Supabase 클라이언트 초기화
      const supabase = createClient();

      // 닉네임 중복 체크
      const { data: existingNickname } = await supabase
        .from('profiles')
        .select('id')
        .eq('nickname', nickname.trim())
        .maybeSingle();

      if (existingNickname) {
        setError('이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해주세요.');
        setIsLoading(false);
        return;
      }
    } catch (nicknameCheckError) {
      console.error('닉네임 중복 체크 오류:', nicknameCheckError);
      // 중복 체크 실패해도 계속 진행 (서버에서도 체크됨)
    }

    // 주소 필수 확인
    if (!postalCode || !postalCode.trim()) {
      setError('우편번호를 입력해주세요.');
      setIsLoading(false);
      return;
    }

    if (!address || !address.trim()) {
      setError('주소를 입력해주세요.');
      setIsLoading(false);
      return;
    }

    if (!recipientName || !recipientName.trim()) {
      setError('수령인 이름을 입력해주세요.');
      setIsLoading(false);
      return;
    }

    if (!phone || !phone.trim()) {
      setError('전화번호를 입력해주세요.');
      setIsLoading(false);
      return;
    }

    try {
      // Supabase 클라이언트 초기화
      const supabase = createClient();

      // 회원가입
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            email: email,
          },
        },
      });

      // 디버깅을 위한 콘솔 로그
      console.log('Signup response:', { data, error: signUpError });

      if (signUpError) {
        console.error('Signup error:', signUpError);
        
        // 더 친절한 에러 메시지
        let errorMessage = '회원가입 중 오류가 발생했습니다. ';
        if (signUpError.message.includes('Email signups are disabled')) {
          errorMessage = '이메일 회원가입이 비활성화되어 있습니다. Supabase 대시보드에서 "Enable email signup"을 활성화해주세요.';
        } else if (signUpError.message.includes('User already registered')) {
          errorMessage = '이미 가입된 이메일입니다. 로그인 페이지로 이동하세요.';
        } else if (signUpError.message.includes('Invalid email')) {
          errorMessage = '올바른 이메일 형식이 아닙니다.';
        } else if (signUpError.message.includes('Password')) {
          errorMessage = '비밀번호 요구사항을 확인해주세요.';
        } else {
          errorMessage += signUpError.message;
        }
        
        setError(errorMessage);
        setIsLoading(false);
        return;
      }

      // 회원가입 성공 확인
      if (!data || !data.user) {
        console.error('Signup failed: No user data returned');
        setError('회원가입에 실패했습니다. 다시 시도해주세요.');
        setIsLoading(false);
        return;
      }

      // 프로필 자동 생성 확인 (Supabase 트리거가 있으면 자동 생성됨)
      // 만약 트리거가 없다면 여기서 프로필 생성 시도
      try {
        // 먼저 프로필이 이미 존재하는지 확인
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single();

        // 프로필이 없으면 생성, 있으면 정보 업데이트
        if (!existingProfile) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email || email,
              nickname: nickname.trim(),
              postal_code: postalCode.trim(),
              address: address.trim(),
              address_detail: addressDetail.trim() || null,
              recipient_name: recipientName.trim(),
              phone: phone.trim(),
            })
            .select()
            .single();

          if (profileError) {
            // 중복 키 에러는 무시 (트리거가 이미 생성했을 수 있음)
            const errorMsg = profileError.message?.toLowerCase() || '';
            if (!errorMsg.includes('duplicate') && 
                !errorMsg.includes('already exists') &&
                !errorMsg.includes('unique constraint')) {
              console.warn('Profile creation warning:', profileError);
            } else {
              // 트리거로 생성된 경우 정보 업데이트
              await supabase
                .from('profiles')
                .update({ 
                  nickname: nickname.trim(),
                  postal_code: postalCode.trim(),
                  address: address.trim(),
                  address_detail: addressDetail.trim() || null,
                  recipient_name: recipientName.trim(),
                  phone: phone.trim(),
                })
                .eq('id', data.user.id);
            }
          } else {
            console.log('Profile created successfully');
          }
        } else {
          // 프로필이 이미 있으면 정보 업데이트
          await supabase
            .from('profiles')
            .update({ 
              nickname: nickname.trim(),
              postal_code: postalCode.trim(),
              address: address.trim(),
              address_detail: addressDetail.trim() || null,
              recipient_name: recipientName.trim(),
              phone: phone.trim(),
            })
            .eq('id', data.user.id);
          console.log('Profile updated');
        }
      } catch (profileErr: any) {
        // 프로필 생성 실패해도 회원가입은 성공한 것으로 처리
        console.warn('Profile creation attempt failed (may already exist):', profileErr);
      }

      // 이메일 확인 여부와 관계없이 바로 대시보드로 이동
      // Supabase 설정에서 이메일 확인이 비활성화되어 있으면 자동으로 확인된 상태
      // 확인이 필요한 경우에도 세션이 있으면 일단 대시보드로 이동
      if (data.session) {
        // 세션이 있으면 바로 홈으로 이동
        setMessage('회원가입이 완료되었습니다!');
        setTimeout(() => {
          router.push('/');
        }, 1000);
      } else if (data.user && !data.user.email_confirmed_at) {
        // 세션이 없고 이메일 확인이 필요한 경우
        // 하지만 일단 홈으로 이동 시도 (Supabase 설정에 따라 다를 수 있음)
        setMessage('회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.');
        setTimeout(() => {
          router.push('/login?message=회원가입이 완료되었습니다. 로그인해주세요.');
        }, 2000);
      } else {
        // 이미 확인된 경우
        setMessage('회원가입이 완료되었습니다!');
        setTimeout(() => {
          router.push('/');
        }, 1000);
      }
    } catch (error: any) {
      console.error('Unexpected signup error:', error);
      setError(`예상치 못한 오류가 발생했습니다: ${error?.message || '알 수 없는 오류'}`);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            회원가입
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            그때 그 게임의 모든 것을 한 곳에서
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          <div className="space-y-4">
            {/* 닉네임 */}
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
                닉네임 <span className="text-red-500">*</span>
              </label>
              <input
                id="nickname"
                name="nickname"
                type="text"
                autoComplete="nickname"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="닉네임 (최소 2자)"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                minLength={2}
              />
            </div>

            {/* 이메일 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                이메일 주소 <span className="text-red-500">*</span>
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

            {/* 비밀번호 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호 <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="비밀번호 (최소 6자)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호 확인 <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="비밀번호 확인"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {/* 구분선 */}
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">배송 정보</p>
            </div>

            {/* 수령인 이름 */}
            <div>
              <label htmlFor="recipientName" className="block text-sm font-medium text-gray-700 mb-1">
                수령인 이름 <span className="text-red-500">*</span>
              </label>
              <input
                id="recipientName"
                name="recipientName"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="수령인 이름"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>

            {/* 전화번호 */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                전화번호 <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="010-1234-5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {/* 우편번호 */}
            <div>
              <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                우편번호 <span className="text-red-500">*</span>
              </label>
              <input
                id="postalCode"
                name="postalCode"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="우편번호"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
              />
            </div>

            {/* 기본 주소 */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                기본 주소 <span className="text-red-500">*</span>
              </label>
              <input
                id="address"
                name="address"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="기본 주소"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            {/* 상세 주소 */}
            <div>
              <label htmlFor="addressDetail" className="block text-sm font-medium text-gray-700 mb-1">
                상세 주소 <span className="text-gray-400 text-xs">(선택)</span>
              </label>
              <input
                id="addressDetail"
                name="addressDetail"
                type="text"
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="상세 주소 (동/호수 등)"
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? '처리 중...' : '회원가입'}
            </button>
          </div>

          {error && (
            <div className="text-sm text-center text-red-600">
              {error}
            </div>
          )}

          {message && (
            <div className="text-sm text-center text-green-600">
              {message}
            </div>
          )}

          <div className="text-center">
            <p className="text-sm text-gray-600">
              이미 계정이 있으신가요?{' '}
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                로그인
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}


