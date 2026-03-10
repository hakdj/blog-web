import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth';

/**
 * 구멍가게 상품 이미지 업로드
 * POST /api/upload/product-image
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json({ error: '관리자만 상품 이미지를 업로드할 수 있습니다.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: '파일이 필요합니다.' }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: '파일 크기는 5MB 이하여야 합니다.' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '지원하는 이미지 형식: JPG, PNG, GIF, WEBP' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}_${timestamp}.${fileExt}`;
    const filePath = `product-images/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('public').upload(filePath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json(
        { error: '이미지 업로드에 실패했습니다: ' + uploadError.message },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('public').getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
      fileSize: file.size,
      fileType: file.type,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * 상품 이미지 삭제
 * DELETE /api/upload/product-image?url=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json({ error: '관리자만 상품 이미지를 삭제할 수 있습니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');
    if (!imageUrl) {
      return NextResponse.json({ error: '이미지 URL이 필요합니다.' }, { status: 400 });
    }

    const urlParts = imageUrl.split('/public/');
    if (urlParts.length < 2) {
      return NextResponse.json({ error: '잘못된 이미지 URL입니다.' }, { status: 400 });
    }

    const filePath = urlParts[1];
    const fileName = filePath.split('/').pop();
    if (!fileName?.startsWith(user.id)) {
      return NextResponse.json({ error: '본인이 업로드한 이미지만 삭제할 수 있습니다.' }, { status: 403 });
    }

    const { error: deleteError } = await supabase.storage.from('public').remove([filePath]);
    if (deleteError) {
      return NextResponse.json(
        { error: '이미지 삭제에 실패했습니다: ' + deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: '이미지가 삭제되었습니다.' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
