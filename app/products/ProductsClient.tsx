'use client';

import { useEffect, useMemo, useState } from 'react';

type Product = {
  id: string;
  name: string;
  description: string | null;
  category: 'toy' | 'snack' | 'game' | 'stationery' | 'etc';
  price: number;
  rental_price: number | null;
  stock_quantity: number;
  available_quantity: number;
  is_rental: boolean;
  is_for_sale: boolean;
  image_url: string | null;
  external_url: string | null;
  external_platform: 'smartstore' | 'coupang' | 'etc' | null;
  is_available: boolean;
  owner_user_id: string | null;
  created_at: string;
};

const CATEGORY_OPTIONS = [
  { value: 'toy', label: '장난감' },
  { value: 'snack', label: '간식' },
  { value: 'game', label: '게임' },
  { value: 'stationery', label: '문구' },
  { value: 'etc', label: '기타' },
] as const;

const PLATFORM_OPTIONS = [
  { value: '', label: '플랫폼 선택(선택)' },
  { value: 'smartstore', label: '네이버 스마트스토어' },
  { value: 'coupang', label: '쿠팡' },
  { value: 'etc', label: '기타' },
] as const;

const categoryLabel = (category: Product['category']) =>
  CATEGORY_OPTIONS.find((item) => item.value === category)?.label || category;

const platformLabel = (platform: Product['external_platform']) => {
  if (platform === 'smartstore') return '네이버 스마트스토어';
  if (platform === 'coupang') return '쿠팡';
  if (platform === 'etc') return '기타 외부몰';
  return '외부몰';
};

export default function ProductsClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');
  const [okMessage, setOkMessage] = useState('');
  const [tab, setTab] = useState<'mine' | 'all'>('mine');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Product['category']>('toy');
  const [price, setPrice] = useState('');
  const [rentalPrice, setRentalPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('1');
  const [isRental, setIsRental] = useState(false);
  const [isForSale, setIsForSale] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [externalPlatform, setExternalPlatform] = useState<'smartstore' | 'coupang' | 'etc' | ''>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  const loadProducts = async (nextTab: 'mine' | 'all' = tab) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/products${nextTab === 'mine' ? '?mine=1' : ''}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '상품 목록을 불러오지 못했습니다.');
      setProducts(data.products || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts(tab);
  }, [tab]);

  const canSave = useMemo(() => {
    const parsedPrice = Number(price);
    const parsedStock = Number(stockQuantity);
    return Boolean(name.trim()) && Number.isFinite(parsedPrice) && parsedPrice >= 0 && Number.isFinite(parsedStock) && parsedStock >= 0;
  }, [name, price, stockQuantity]);

  const handleSubmit = async () => {
    if (!canSave) {
      setError('상품명/가격/재고를 확인해주세요.');
      return;
    }

    setSaving(true);
    setError('');
    setOkMessage('');
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          category,
          price: Number(price),
          rental_price: rentalPrice.trim() ? Number(rentalPrice) : null,
          stock_quantity: Number(stockQuantity),
          is_rental: isRental,
          is_for_sale: isForSale,
          image_url: imageUrl.trim() || null,
          external_url: externalUrl.trim() || null,
          external_platform: externalPlatform || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '상품 등록에 실패했습니다.');

      setName('');
      setDescription('');
      setCategory('toy');
      setPrice('');
      setRentalPrice('');
      setStockQuantity('1');
      setIsRental(false);
      setIsForSale(true);
      setImageUrl('');
      setExternalUrl('');
      setExternalPlatform('');
      setOkMessage('상품이 등록되었습니다. 아래 목록에서 바로 확인할 수 있어요.');
      setTab('mine');
      await loadProducts('mine');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingImage(true);
    setError('');
    setOkMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload/product-image', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '이미지 업로드에 실패했습니다.');
      setImageUrl(String(data.url || ''));
      setUploadedFileName(String(data.fileName || file.name));
      setOkMessage('사진 업로드가 완료되었습니다. 등록 시 이 이미지가 사용됩니다.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeUploadedImage = async () => {
    if (!imageUrl) return;
    try {
      await fetch(`/api/upload/product-image?url=${encodeURIComponent(imageUrl)}`, {
        method: 'DELETE',
      });
    } catch {
      // ignore cleanup error
    }
    setImageUrl('');
    setUploadedFileName('');
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('이 상품을 삭제할까요?')) return;
    setDeletingId(productId);
    setError('');
    setOkMessage('');
    try {
      const response = await fetch(`/api/products?id=${encodeURIComponent(productId)}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '삭제에 실패했습니다.');
      setOkMessage('상품이 삭제되었습니다.');
      await loadProducts('mine');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-yellow-500 mb-2">구멍가게</h1>
        <p className="text-gray-600">내 상품 테스트 등록과 외부몰 링크 연동을 바로 진행할 수 있습니다.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-5 space-y-3">
          <h2 className="text-lg font-bold text-gray-900">상품 등록 테스트</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="상품명"
            className="w-full border rounded-lg px-3 py-2"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Product['category'])}
            className="w-full border rounded-lg px-3 py-2"
          >
            {CATEGORY_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="판매가 (원)"
            className="w-full border rounded-lg px-3 py-2"
          />
          <input
            type="number"
            min={0}
            value={rentalPrice}
            onChange={(e) => setRentalPrice(e.target.value)}
            placeholder="대여가 (선택)"
            className="w-full border rounded-lg px-3 py-2"
          />
          <input
            type="number"
            min={0}
            value={stockQuantity}
            onChange={(e) => setStockQuantity(e.target.value)}
            placeholder="재고 수량"
            className="w-full border rounded-lg px-3 py-2"
          />
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="이미지 URL (선택)"
            className="w-full border rounded-lg px-3 py-2"
          />
          <div className="rounded-lg border border-yellow-100 bg-yellow-50 p-3 space-y-2">
            <p className="text-sm font-medium text-gray-800">또는 사진 파일 업로드</p>
            <div className="flex items-center gap-2">
              <label
                htmlFor="product-image-upload"
                className="inline-flex items-center rounded-lg border border-yellow-300 bg-white px-3 py-2 text-sm font-semibold text-yellow-700 hover:bg-yellow-100 cursor-pointer"
              >
                {uploadingImage ? '업로드 중...' : '사진 선택/촬영'}
              </label>
              <span className="text-xs text-gray-600 truncate">
                {uploadedFileName || '선택된 파일 없음'}
              </span>
            </div>
            <input
              id="product-image-upload"
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                void handleImageUpload(file);
                e.currentTarget.value = '';
              }}
            />
            {imageUrl && (
              <div className="flex items-center gap-3">
                <img src={imageUrl} alt="상품 미리보기" className="h-16 w-16 rounded object-cover border" />
                <button
                  onClick={() => void removeUploadedImage()}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  이미지 제거
                </button>
              </div>
            )}
          </div>
          <select
            value={externalPlatform}
            onChange={(e) => setExternalPlatform(e.target.value as 'smartstore' | 'coupang' | 'etc' | '')}
            className="w-full border rounded-lg px-3 py-2"
          >
            {PLATFORM_OPTIONS.map((item) => (
              <option key={item.value || 'none'} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <input
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="외부 상품 URL (스마트스토어/쿠팡)"
            className="w-full border rounded-lg px-3 py-2"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="설명 (선택)"
            rows={3}
            className="w-full border rounded-lg px-3 py-2"
          />

          <div className="flex items-center gap-4 text-sm text-gray-700">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={isForSale} onChange={(e) => setIsForSale(e.target.checked)} />
              판매 가능
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={isRental} onChange={(e) => setIsRental(e.target.checked)} />
              대여 가능
            </label>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSave || saving || uploadingImage}
            className="w-full bg-yellow-500 text-white rounded-lg px-4 py-2 font-bold hover:bg-yellow-600 disabled:opacity-50"
          >
            {uploadingImage ? '이미지 업로드 대기 중...' : saving ? '등록 중...' : '상품 등록'}
          </button>
          <p className="text-xs text-gray-500">
            외부 URL을 넣으면 카드에 "스토어에서 보기" 버튼이 생겨 스마트스토어/쿠팡으로 바로 이동합니다.
          </p>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('mine')}
              className={`px-3 py-2 rounded-lg border text-sm font-medium ${
                tab === 'mine' ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white text-gray-700'
              }`}
            >
              내 상품
            </button>
            <button
              onClick={() => setTab('all')}
              className={`px-3 py-2 rounded-lg border text-sm font-medium ${
                tab === 'all' ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white text-gray-700'
              }`}
            >
              전체 공개 상품
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
          )}
          {okMessage && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
              {okMessage}
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-xl shadow p-6 text-center text-gray-600">불러오는 중...</div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-6 text-center text-gray-600">
              {tab === 'mine'
                ? '내가 등록한 상품이 없습니다. 왼쪽 폼에서 첫 상품을 등록해보세요.'
                : '공개된 상품이 없습니다.'}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {products.map((product) => (
                <div key={product.id} className="bg-white rounded-xl shadow p-4 border border-yellow-100">
                  {product.image_url && (
                    <img src={product.image_url} alt={product.name} className="w-full h-40 object-cover rounded-lg mb-3" />
                  )}
                  <h3 className="text-lg font-bold text-gray-900">{product.name}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm text-gray-500">{categoryLabel(product.category)}</p>
                    {product.external_url && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                        {platformLabel(product.external_platform)}
                      </span>
                    )}
                  </div>
                  {product.description && (
                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">{product.description}</p>
                  )}
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>판매가: {product.price.toLocaleString()}원</p>
                    <p>대여가: {product.rental_price ? `${product.rental_price.toLocaleString()}원` : '-'}</p>
                    <p>재고: {product.available_quantity ?? product.stock_quantity}개</p>
                    <p>옵션: {product.is_for_sale ? '판매' : '-'} / {product.is_rental ? '대여' : '-'}</p>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    {product.external_url && (
                      <a
                        href={product.external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-medium hover:bg-blue-700"
                      >
                        스토어에서 보기
                      </a>
                    )}
                    {tab === 'mine' && (
                      <button
                        onClick={() => handleDelete(product.id)}
                        disabled={deletingId === product.id}
                        className="inline-flex items-center rounded-lg border border-red-200 bg-white text-red-600 px-3 py-2 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === product.id ? '삭제 중...' : '삭제'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
