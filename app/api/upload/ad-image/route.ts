import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 광고 이미지 업로드
 * POST /api/upload/ad-image
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
        { error: '유료 구독자만 이미지를 업로드할 수 있습니다.' },
        { status: 403 }
      );
    }

    // FormData에서 파일 추출
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: '파일이 필요합니다.' },
        { status: 400 }
      );
    }

    // 파일 크기 검증 (최대 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '파일 크기는 5MB 이하여야 합니다.' },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '지원하는 이미지 형식: JPG, PNG, GIF, WEBP' },
        { status: 400 }
      );
    }

    // 파일명 생성 (사용자ID_타임스탬프_원본파일명)
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}_${timestamp}.${fileExt}`;
    const filePath = `ad-images/${fileName}`;

    // Supabase Storage에 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('public')
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: '이미지 업로드에 실패했습니다: ' + uploadError.message },
        { status: 500 }
      );
    }

    // 공개 URL 생성
    const { data: { publicUrl } } = supabase.storage
      .from('public')
      .getPublicUrl(filePath);

    console.log('✅ 이미지 업로드 성공:', publicUrl);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: fileName,
      fileSize: file.size,
      fileType: file.type
    });

  } catch (error) {
    console.error('Error in POST /api/upload/ad-image:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * 광고 이미지 삭제
 * DELETE /api/upload/ad-image?url=xxx
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
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json(
        { error: '이미지 URL이 필요합니다.' },
        { status: 400 }
      );
    }

    // URL에서 파일 경로 추출
    // 예: https://xxx.supabase.co/storage/v1/object/public/public/ad-images/filename.jpg
    const urlParts = imageUrl.split('/public/');
    if (urlParts.length < 2) {
      return NextResponse.json(
        { error: '잘못된 이미지 URL입니다.' },
        { status: 400 }
      );
    }

    const filePath = urlParts[1];

    // 파일명에서 사용자 ID 확인 (본인 파일만 삭제 가능)
    const fileName = filePath.split('/').pop();
    if (!fileName?.startsWith(user.id)) {
      return NextResponse.json(
        { error: '본인이 업로드한 이미지만 삭제할 수 있습니다.' },
        { status: 403 }
      );
    }

    // Supabase Storage에서 삭제
    const { error: deleteError } = await supabase.storage
      .from('public')
      .remove([filePath]);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json(
        { error: '이미지 삭제에 실패했습니다: ' + deleteError.message },
        { status: 500 }
      );
    }

    console.log('✅ 이미지 삭제 성공:', filePath);

    return NextResponse.json({
      success: true,
      message: '이미지가 삭제되었습니다.'
    });

  } catch (error) {
    console.error('Error in DELETE /api/upload/ad-image:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
