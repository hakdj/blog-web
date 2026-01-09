import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 광고 목록 조회
 * GET /api/ads - 모든 활성 광고 조회
 * GET /api/ads?user_id=xxx - 특정 사용자의 광고 조회
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    let query = supabase
      .from('user_ads')
      .select(`
        *,
        users:user_id (email)
      `)
      .order('created_at', { ascending: false });

    // 특정 사용자의 광고만 조회
    if (userId) {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 본인의 광고만 조회 가능
      if (!user || user.id !== userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      query = query.eq('user_id', userId);
    } else {
      // 전체 조회 시 활성 광고만
      query = query.eq('status', 'active');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching ads:', error);
      return NextResponse.json(
        { error: 'Failed to fetch ads' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ads: data });
  } catch (error) {
    console.error('Error in GET /api/ads:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 광고 생성
 * POST /api/ads
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 유료 구독자 확인
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!subscription) {
      return NextResponse.json(
        { error: '유료 구독자만 광고를 등록할 수 있습니다.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, image_url, link_url, end_date } = body;

    // 입력 검증
    if (!title || !link_url) {
      return NextResponse.json(
        { error: '제목과 링크 URL은 필수입니다.' },
        { status: 400 }
      );
    }

    // 광고 생성
    const { data, error } = await supabase
      .from('user_ads')
      .insert({
        user_id: user.id,
        title,
        description,
        image_url,
        link_url,
        end_date,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating ad:', error);
      return NextResponse.json(
        { error: '광고 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      ad: data 
    });
  } catch (error) {
    console.error('Error in POST /api/ads:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 광고 수정
 * PUT /api/ads
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, title, description, image_url, link_url, status, end_date } = body;

    if (!id) {
      return NextResponse.json(
        { error: '광고 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 광고 소유자 확인
    const { data: existingAd } = await supabase
      .from('user_ads')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existingAd || existingAd.user_id !== user.id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 광고 수정
    const { data, error } = await supabase
      .from('user_ads')
      .update({
        title,
        description,
        image_url,
        link_url,
        status,
        end_date
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating ad:', error);
      return NextResponse.json(
        { error: '광고 수정에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      ad: data 
    });
  } catch (error) {
    console.error('Error in PUT /api/ads:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 광고 삭제
 * DELETE /api/ads?id=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const adId = searchParams.get('id');

    if (!adId) {
      return NextResponse.json(
        { error: '광고 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 광고 소유자 확인
    const { data: existingAd } = await supabase
      .from('user_ads')
      .select('user_id')
      .eq('id', adId)
      .single();

    if (!existingAd || existingAd.user_id !== user.id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 광고 삭제
    const { error } = await supabase
      .from('user_ads')
      .delete()
      .eq('id', adId);

    if (error) {
      console.error('Error deleting ad:', error);
      return NextResponse.json(
        { error: '광고 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: '광고가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('Error in DELETE /api/ads:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
