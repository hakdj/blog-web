import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const ADMIN_EMAILS = ['hakdjhakdj@naver.com'];

// 관리자 대시보드 데이터를 가져오는 API
// 서비스 클라이언트를 사용하여 RLS 정책을 완전히 우회
export async function GET(request: NextRequest) {
  try {
    // 헤더에서 사용자 이메일 가져오기 (클라이언트에서 전달)
    const userEmail = request.headers.get('X-User-Email');
    
    console.log('관리자 데이터 API - 요청 확인:', {
      userEmail: userEmail,
      hasEmailHeader: !!userEmail,
    });
    
    // 이메일이 없으면 쿠키에서 인증 시도
    if (!userEmail) {
      const cookieStore = await cookies();
      const supabaseAuth = await createClient();
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      
      console.log('관리자 데이터 API - 쿠키 인증:', {
        hasUser: !!user,
        userEmail: user?.email,
        authError: authError?.message,
      });
      
      if (authError || !user) {
        console.error('관리자 데이터 API - 인증 실패:', authError);
        return NextResponse.json(
          { error: '인증이 필요합니다', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }
      
      const adminCheck = ADMIN_EMAILS.includes(user.email?.toLowerCase() || '');
      if (!adminCheck) {
        return NextResponse.json(
          { error: '관리자 권한이 필요합니다', code: 'FORBIDDEN' },
          { status: 403 }
        );
      }
    } else {
      // 헤더에서 이메일을 받았으면 관리자 확인
      const adminCheck = ADMIN_EMAILS.includes(userEmail.toLowerCase());
      console.log('관리자 데이터 API - 헤더 인증:', {
        email: userEmail,
        isAdmin: adminCheck,
      });
      
      if (!adminCheck) {
        console.warn('관리자 데이터 API - 권한 없음:', userEmail);
        return NextResponse.json(
          { error: '관리자 권한이 필요합니다', code: 'FORBIDDEN' },
          { status: 403 }
        );
      }
    }
    
    // 서비스 클라이언트 사용 (RLS 우회)
    const supabase = createServiceClient();
    
    // 병렬로 모든 데이터 가져오기
    const [subsResult, usersResult, usageResult, paymentsResult] = await Promise.allSettled([
      // 전체 구독 통계
      supabase
        .from('subscriptions')
        .select(`
          *,
          plan:plans(*),
          user:profiles(email, nickname)
        `)
        .order('created_at', { ascending: false }),
      
      // 전체 사용자 수
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true }),
      
      // 사용량 통계
      (async () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        return supabase
          .from('usage_logs')
          .select('usage_type, count')
          .gte('created_at', startOfMonth);
      })(),
      
      // 결제 통계
      (async () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        return supabase
          .from('payments')
          .select('amount, currency, status')
          .eq('status', 'paid')
          .gte('paid_at', startOfMonth);
      })(),
    ]);

    // 결과 처리
    const result: any = {
      subscriptions: [],
      activeSubscriptions: [],
      totalUsers: 0,
      agentUsage: 0,
      bulkUsage: 0,
      monthlyRevenue: 0,
      errors: [],
    };

    // 구독 데이터 처리
    if (subsResult.status === 'fulfilled') {
      const { data: subsData, error: subsError } = subsResult.value;
      if (subsError) {
        console.error('구독 데이터 로드 오류:', subsError);
        result.errors.push({ type: 'subscriptions', error: subsError.message });
      } else if (subsData) {
        result.subscriptions = subsData;
        result.activeSubscriptions = subsData.filter(
          (sub: any) => sub.status === 'active' && new Date(sub.current_period_end) > new Date()
        );
      }
    } else {
      console.error('구독 데이터 로드 실패:', subsResult.reason);
      result.errors.push({ type: 'subscriptions', error: String(subsResult.reason) });
    }

    // 사용자 수 처리
    if (usersResult.status === 'fulfilled') {
      const { count, error: usersError } = usersResult.value;
      if (usersError) {
        console.error('사용자 수 로드 오류:', usersError);
        result.errors.push({ type: 'users', error: usersError.message });
      } else {
        result.totalUsers = count || 0;
      }
    } else {
      console.error('사용자 수 로드 실패:', usersResult.reason);
      result.errors.push({ type: 'users', error: String(usersResult.reason) });
    }

    // 사용량 통계 처리
    if (usageResult.status === 'fulfilled') {
      const { data: usageLogs, error: usageError } = usageResult.value;
      if (usageError) {
        console.error('사용량 로드 오류:', usageError);
        result.errors.push({ type: 'usage', error: usageError.message });
      } else {
        const agent = usageLogs
          ?.filter((log: any) => log.usage_type === 'agent')
          .reduce((sum: number, log: any) => sum + (log.count || 1), 0) || 0;
        result.agentUsage = agent;

        const bulk = usageLogs
          ?.filter((log: any) => log.usage_type === 'bulk')
          .reduce((sum: number, log: any) => sum + (log.count || 1), 0) || 0;
        result.bulkUsage = bulk;
      }
    } else {
      console.error('사용량 로드 실패:', usageResult.reason);
      result.errors.push({ type: 'usage', error: String(usageResult.reason) });
    }

    // 결제 통계 처리
    if (paymentsResult.status === 'fulfilled') {
      const { data: payments, error: paymentsError } = paymentsResult.value;
      if (paymentsError) {
        console.error('결제 데이터 로드 오류:', paymentsError);
        result.errors.push({ type: 'payments', error: paymentsError.message });
      } else {
        result.monthlyRevenue = payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
      }
    } else {
      console.error('결제 데이터 로드 실패:', paymentsResult.reason);
      result.errors.push({ type: 'payments', error: String(paymentsResult.reason) });
    }

    console.log('관리자 데이터 로드 완료:', {
      subscriptions: result.subscriptions.length,
      activeSubscriptions: result.activeSubscriptions.length,
      totalUsers: result.totalUsers,
      errors: result.errors.length,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('관리자 데이터 API 오류:', error);
    return NextResponse.json(
      { 
        error: error.message || '알 수 없는 오류',
        subscriptions: [],
        activeSubscriptions: [],
        totalUsers: 0,
        agentUsage: 0,
        bulkUsage: 0,
        monthlyRevenue: 0,
        errors: [{ type: 'general', error: error.message }],
      },
      { status: 500 }
    );
  }
}

