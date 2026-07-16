import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Category, Brand, Product } from '@/types';
import ProductCard from '@/components/ProductCard';
import Loader from '@/components/Loader';

type SortKey = 'newest' | 'price_asc' | 'price_desc';

export default function Shop() {
  const { categorySlug } = useParams();
  const [searchParams] = useSearchParams();
  const brandFilterFromUrl = searchParams.get('brand');

  const [category, setCategory] = useState<Category | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedBrand, setSelectedBrand] = useState(brandFilterFromUrl ?? 'all');
  const [material, setMaterial] = useState('all');
  const [color, setColor] = useState('all');
  const [maxPrice, setMaxPrice] = useState(5000);
  const [sort, setSort] = useState<SortKey>('newest');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: cat }, { data: brs }] = await Promise.all([
        categorySlug
          ? supabase.from('categories').select('*').eq('slug', categorySlug).single()
          : Promise.resolve({ data: null }),
        supabase.from('brands').select('*').eq('is_active', true).order('display_order'),
      ]);
      setCategory((cat as Category) ?? null);
      setBrands((brs as Brand[]) ?? []);
      setLoading(false);
    })();
  }, [categorySlug]);

  useEffect(() => {
    (async () => {
      let query = supabase.from('products').select('*, category:categories(*), brand:brands(*)').eq('is_active', true);
      if (category) query = query.eq('category_id', category.id);
      if (selectedBrand !== 'all') {
        const brand = brands.find((b) => b.slug === selectedBrand);
        if (brand) query = query.eq('brand_id', brand.id);
      }
      if (material !== 'all') query = query.eq('material', material);
      if (color !== 'all') query = query.eq('color', color);
      query = query.lte('price', maxPrice);

      if (sort === 'price_asc') query = query.order('sale_price', { ascending: true });
      else if (sort === 'price_desc') query = query.order('sale_price', { ascending: false });
      else query = query.order('created_at', { ascending: false });

      const { data } = await query;
      setProducts((data as Product[]) ?? []);
    })();
  }, [category, selectedBrand, material, color, maxPrice, sort, brands]);

  if (loading) return <Loader label="Loading category" />;

  const facets = category?.filter_config ?? [];
  const materials = Array.from(new Set(products.map((p) => p.material).filter(Boolean)));
  const colors = Array.from(new Set(products.map((p) => p.color).filter(Boolean)));

  return (
    <div className="container-page py-xl">
      <div className="mb-lg">
        <p className="eyebrow">Shop</p>
        <h1 className="mt-1 text-headline-lg text-on-surface">{category?.name ?? 'All Products'}</h1>
        {category?.description && <p className="mt-1 max-w-lg text-body-md text-on-surface-variant">{category.description}</p>}
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* Filters sidebar */}
        <aside className="card-surface h-fit space-y-5 p-5">
          <p className="flex items-center gap-1.5 text-label-sm font-semibold text-on-surface">
            <span className="material-symbols-outlined !text-base text-primary">tune</span>
            Filters
          </p>

          {facets.includes('brand') && (
            <div>
              <label className="mb-1.5 block text-caption font-semibold uppercase tracking-wide text-on-surface-variant">Brand</label>
              <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)} className="input-field bg-white !py-2 text-label-sm">
                <option value="all">All Brands</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.slug}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(facets.includes('material')) && materials.length > 0 && (
            <div>
              <label className="mb-1.5 block text-caption font-semibold uppercase tracking-wide text-on-surface-variant">Material</label>
              <select value={material} onChange={(e) => setMaterial(e.target.value)} className="input-field bg-white !py-2 text-label-sm">
                <option value="all">Any Material</option>
                {materials.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {facets.includes('color') && colors.length > 0 && (
            <div>
              <label className="mb-1.5 block text-caption font-semibold uppercase tracking-wide text-on-surface-variant">Color</label>
              <select value={color} onChange={(e) => setColor(e.target.value)} className="input-field bg-white !py-2 text-label-sm">
                <option value="all">Any Color</option>
                {colors.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {facets.includes('price') && (
            <div>
              <label className="mb-1.5 block text-caption font-semibold uppercase tracking-wide text-on-surface-variant">
                Max Price: ₹{maxPrice}
              </label>
              <input
                type="range"
                min={100}
                max={5000}
                step={50}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          )}
        </aside>

        {/* Product grid */}
        <div>
          <div className="mb-4 flex justify-end">
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="input-field w-auto bg-white !py-2 text-label-sm">
              <option value="newest">Newest first</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>

          {products.length === 0 ? (
            <div className="card-surface flex flex-col items-center gap-2 py-24 text-center">
              <span className="material-symbols-outlined !text-4xl text-outline">inventory_2</span>
              <p className="text-headline-md !text-lg text-on-surface">No products match these filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-md sm:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
