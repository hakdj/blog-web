import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth';

const ALLOWED_CATEGORIES = new Set(['toy', 'snack', 'game', 'stationery', 'etc']);
const ALLOWED_PLATFORMS = new Set(['smartstore', 'coupang', 'etc']);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mineOnly = searchParams.get('mine') === '1';
    const adminMode = searchParams.get('admin') === '1';
    const service = createServiceClient();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const adminUser = isAdmin(user);
    if ((mineOnly || adminMode) && !adminUser) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    if (!adminUser) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('current_period_end', new Date().toISOString())
        .limit(1);

      if (!subscription || subscription.length === 0) {
        return NextResponse.json({ error: '구독자만 상품을 조회할 수 있습니다.' }, { status: 403 });
      }
    }

    if (adminMode) {
      const { data, error } = await service
        .from('products')
        .select(
          'id, name, description, category, price, rental_price, stock_quantity, available_quantity, is_rental, is_for_sale, image_url, external_url, external_platform, is_available, owner_user_id, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        return NextResponse.json({ error: '관리자 상품 목록을 불러오지 못했습니다.' }, { status: 500 });
      }

      return NextResponse.json({ products: data ?? [] });
    }

    if (mineOnly) {
      const { data, error } = await service
        .from('products')
        .select(
          'id, name, description, category, price, rental_price, stock_quantity, available_quantity, is_rental, is_for_sale, image_url, external_url, external_platform, is_available, owner_user_id, created_at'
        )
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        return NextResponse.json({ error: '내 상품 목록을 불러오지 못했습니다.' }, { status: 500 });
      }

      return NextResponse.json({ products: data ?? [] });
    }

    const { data, error } = await service
      .from('products')
      .select(
        'id, name, description, category, price, rental_price, stock_quantity, available_quantity, is_rental, is_for_sale, image_url, external_url, external_platform, is_available, owner_user_id, created_at'
      )
      .eq('is_available', true)
      .order('created_at', { ascending: false })
      .limit(60);

    if (error) {
      return NextResponse.json({ error: '상품 목록을 불러오지 못했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ products: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json({ error: '관리자만 상품을 등록할 수 있습니다.' }, { status: 403 });
    }

    const body = await request.json();
    const name = String(body?.name || '').trim();
    const description = String(body?.description || '').trim();
    const category = String(body?.category || '').trim();
    const price = Number(body?.price || 0);
    const rentalPrice = body?.rental_price === '' || body?.rental_price == null ? null : Number(body.rental_price);
    const stockQuantity = Number(body?.stock_quantity || 0);
    const isRental = Boolean(body?.is_rental);
    const isForSale = Boolean(body?.is_for_sale);
    const imageUrl = String(body?.image_url || '').trim();
    const externalUrl = String(body?.external_url || '').trim();
    const externalPlatform = String(body?.external_platform || '').trim();

    if (!name) {
      return NextResponse.json({ error: '상품명을 입력해주세요.' }, { status: 400 });
    }
    if (!ALLOWED_CATEGORIES.has(category)) {
      return NextResponse.json({ error: '카테고리 값이 올바르지 않습니다.' }, { status: 400 });
    }
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: '가격은 0원 이상이어야 합니다.' }, { status: 400 });
    }
    if (rentalPrice !== null && (!Number.isFinite(rentalPrice) || rentalPrice < 0)) {
      return NextResponse.json({ error: '대여 가격은 0원 이상이어야 합니다.' }, { status: 400 });
    }
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      return NextResponse.json({ error: '재고 수량은 0개 이상이어야 합니다.' }, { status: 400 });
    }
    if (externalPlatform && !ALLOWED_PLATFORMS.has(externalPlatform)) {
      return NextResponse.json({ error: '외부 플랫폼 값이 올바르지 않습니다.' }, { status: 400 });
    }
    if (externalUrl) {
      try {
        const parsed = new URL(externalUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return NextResponse.json({ error: '외부 링크는 http/https만 허용됩니다.' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: '외부 링크 URL 형식이 올바르지 않습니다.' }, { status: 400 });
      }
    }

    const service = createServiceClient();
    const { data, error } = await service
      .from('products')
      .insert({
        name,
        description: description || null,
        category,
        price: Math.floor(price),
        rental_price: rentalPrice === null ? null : Math.floor(rentalPrice),
        stock_quantity: Math.floor(stockQuantity),
        is_rental: isRental,
        is_for_sale: isForSale,
        image_url: imageUrl || null,
        owner_user_id: user.id,
        external_url: externalUrl || null,
        external_platform: externalPlatform || null,
        is_available: true,
      })
      .select('id, name, category, price, stock_quantity, is_rental, is_for_sale, external_url, external_platform, created_at')
      .single();

    if (error) {
      return NextResponse.json(
        { error: '상품 등록에 실패했습니다.', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, product: data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json({ error: '관리자만 상품을 삭제할 수 있습니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const productId = String(searchParams.get('id') || '').trim();
    if (!productId) {
      return NextResponse.json({ error: '상품 ID가 필요합니다.' }, { status: 400 });
    }

    const service = createServiceClient();
    const { data: product, error: findError } = await service
      .from('products')
      .select('id, owner_user_id')
      .eq('id', productId)
      .single();

    if (findError || !product) {
      return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });
    }
    const { error } = await service.from('products').delete().eq('id', productId);
    if (error) {
      return NextResponse.json({ error: '상품 삭제에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
