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
      .select('*')
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
    console.log('📢 POST /api/ads - 광고 생성 요청');
    const supabase = await createClient();
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized', details: authError.message },
        { status: 401 }
      );
    }
    
    if (!user) {
      console.error('❌ No user found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // 유료 구독자 확인
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (subError) {
      console.error('❌ Subscription query error:', subError);
    }

    console.log('📋 Subscription status:', subscription);

    if (!subscription) {
      console.error('❌ No active subscription found');
      return NextResponse.json(
        { error: '유료 구독자만 광고를 등록할 수 있습니다.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, image_url, link_url, end_date } = body;

    console.log('📝 Ad data:', { title, link_url, has_image: !!image_url, end_date });

    // 입력 검증
    if (!title || !link_url) {
      console.error('❌ Missing required fields');
      return NextResponse.json(
        { error: '제목과 링크 URL은 필수입니다.' },
        { status: 400 }
      );
    }

    // end_date 처리: 빈 문자열이면 null로 변환
    const processedEndDate = end_date && end_date.trim() !== '' ? end_date : null;
    console.log('📅 Processed end_date:', processedEndDate);

    // 광고 생성
    console.log('💾 Inserting ad into database...');
    const { data, error } = await supabase
      .from('user_ads')
      .insert({
        user_id: user.id,
        title,
        description: description || null,
        image_url: image_url || null,
        link_url,
        end_date: processedEndDate,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { error: '광고 생성에 실패했습니다.', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Ad created successfully:', data.id);
    return NextResponse.json({ 
      success: true, 
      ad: data 
    });
  } catch (error) {
    console.error('❌ Unexpected error in POST /api/ads:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
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

    // 유료 구독자 확인
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!subscription) {
      return NextResponse.json(
        { error: '유료 구독이 필요합니다. 구독이 만료되었거나 취소되었습니다.' },
        { status: 403 }
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

    // end_date 처리: 빈 문자열이면 null로 변환
    const processedEndDate = end_date && end_date.trim() !== '' ? end_date : null;

    // 광고 수정
    const { data, error } = await supabase
      .from('user_ads')
      .update({
        title,
        description: description || null,
        image_url: image_url || null,
        link_url,
        status,
        end_date: processedEndDate
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

    // 광고 소유자 확인 및 이미지 URL 가져오기
    const { data: existingAd } = await supabase
      .from('user_ads')
      .select('user_id, image_url')
      .eq('id', adId)
      .single();

    if (!existingAd || existingAd.user_id !== user.id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 업로드된 이미지가 있으면 Storage에서도 삭제
    if (existingAd.image_url && existingAd.image_url.includes('/storage/v1/object/public/')) {
      try {
        const urlParts = existingAd.image_url.split('/public/');
        if (urlParts.length >= 2) {
          const filePath = urlParts[1];
          await supabase.storage.from('public').remove([filePath]);
          console.log('✅ 이미지 삭제 성공:', filePath);
        }
      } catch (imgError) {
        console.error('⚠️ 이미지 삭제 실패 (계속 진행):', imgError);
        // 이미지 삭제 실패해도 광고는 삭제
      }
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
