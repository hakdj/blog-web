'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function TestPage() {
  const [result, setResult] = useState<string>('테스트 대기 중...');
  const [loading, setLoading] = useState(false);
  
  // 환경 변수 확인
  const envCheck = `환경 변수 확인:
NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || '❌ 없음'}
NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ 있음 (길이: ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length + ')' : '❌ 없음'}`;
  
  console.log(envCheck);
  
  const supabase = createClient();

  const test1_Auth = async () => {
    setLoading(true);
    setResult('테스트 중...');
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        setResult(`❌ 인증 오류: ${error.message}`);
      } else if (data.user) {
        setResult(`✅ 인증 성공!\n이메일: ${data.user.email}\nID: ${data.user.id}`);
      } else {
        setResult('❌ 사용자 없음 (로그인 필요)');
      }
    } catch (err: any) {
      setResult(`❌ 예외: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const test2_ReadProfiles = async () => {
    setLoading(true);
    setResult('테스트 중...');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(5);
      
      if (error) {
        setResult(`❌ 프로필 읽기 오류: ${error.message}\n코드: ${error.code}\n힌트: ${error.hint || '없음'}`);
      } else {
        setResult(`✅ 프로필 읽기 성공!\n${data.length}개 프로필 발견\n\n${JSON.stringify(data, null, 2)}`);
      }
    } catch (err: any) {
      setResult(`❌ 예외: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const test3_ReadPlans = async () => {
    setLoading(true);
    setResult('테스트 중...');
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*');
      
      if (error) {
        setResult(`❌ 플랜 읽기 오류: ${error.message}\n코드: ${error.code}\n힌트: ${error.hint || '없음'}`);
      } else {
        setResult(`✅ 플랜 읽기 성공!\n${data.length}개 플랜 발견\n\n${JSON.stringify(data, null, 2)}`);
      }
    } catch (err: any) {
      setResult(`❌ 예외: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const test4_InsertPlan = async () => {
    setLoading(true);
    setResult('테스트 중...');
    try {
      const testPlan = {
        name: '테스트 플랜',
        tier: 'basic',
        price: 1000,
        interval: 'month',
        features: ['테스트 기능 1', '테스트 기능 2']
      };

      const { data, error } = await supabase
        .from('plans')
        .insert([testPlan])
        .select();
      
      if (error) {
        setResult(`❌ 플랜 추가 오류: ${error.message}\n코드: ${error.code}\n힌트: ${error.hint || '없음'}`);
      } else {
        setResult(`✅ 플랜 추가 성공!\n\n${JSON.stringify(data, null, 2)}`);
      }
    } catch (err: any) {
      setResult(`❌ 예외: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const test5_UpdatePassword = async () => {
    setLoading(true);
    setResult('테스트 중...');
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: 'test123456'
      });
      
      if (error) {
        setResult(`❌ 비밀번호 변경 오류: ${error.message}\n코드: ${error.status}`);
      } else {
        setResult(`✅ 비밀번호 변경 성공!\n\n${JSON.stringify(data, null, 2)}`);
      }
    } catch (err: any) {
      setResult(`❌ 예외: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">🔍 Supabase 연결 테스트</h1>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">⚙️ 환경 변수 상태</h2>
        <pre className="text-sm whitespace-pre-wrap font-mono">{envCheck}</pre>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">테스트 버튼</h2>
        <div className="space-y-3">
          <button
            onClick={test1_Auth}
            disabled={loading}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            1️⃣ 인증 테스트 (getUser)
          </button>
          
          <button
            onClick={test2_ReadProfiles}
            disabled={loading}
            className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
          >
            2️⃣ 프로필 읽기 테스트
          </button>
          
          <button
            onClick={test3_ReadPlans}
            disabled={loading}
            className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
          >
            3️⃣ 플랜 읽기 테스트
          </button>
          
          <button
            onClick={test4_InsertPlan}
            disabled={loading}
            className="w-full bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium"
          >
            4️⃣ 플랜 추가 테스트
          </button>
          
          <button
            onClick={test5_UpdatePassword}
            disabled={loading}
            className="w-full bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
          >
            5️⃣ 비밀번호 변경 테스트
          </button>
        </div>
      </div>

      <div className="bg-gray-900 text-gray-100 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">결과:</h2>
        <pre className="whitespace-pre-wrap font-mono text-sm">
          {loading ? '⏳ 로딩 중...' : result}
        </pre>
      </div>

      <div className="mt-6">
        <a href="/" className="text-blue-600 hover:text-blue-800 font-medium">
          ← 홈으로 돌아가기
        </a>
      </div>
    </div>
  );
}

