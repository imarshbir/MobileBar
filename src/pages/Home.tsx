import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Product, Category, Brand } from '@/types';
import ProductCard from '@/components/ProductCard';
import Loader from '@/components/Loader';

const CATEGORY_ICONS: Record<string, string> = {
  'mobile-covers': 'phone_iphone',
  'mobile-skins': 'texture',
  'tempered-glass': 'crop_square',
  'gadget-skins': 'laptop_mac',
  'watch-straps': 'watch',
  'charger-covers': 'bolt',
  'cable-protectors': 'cable',
};

function ProductRow({ title, icon, products }: { title: string; icon: string; products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section className="container-page py-lg">
      <div className="mb-md flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">{icon}</span>
        <h2 className="text-headline-lg !text-2xl text-on-surface">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const filter = searchParams.get('filter');

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  // Catch-all: any active product that isn't flagged New Arrival, Best
  // Seller, or Featured never showed up anywhere on the homepage before
  // this — the three rows above only ever query products WHERE that
  // specific flag = true, so an otherwise-ordinary listing with none of
  // them checked had no code path that would ever render it here.
  const [moreProducts, setMoreProducts] = useState<Product[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      if (q.trim()) {
        const { data } = await supabase
          .from('products')
          .select('*, category:categories(*), brand:brands(*)')
          .eq('is_active', true)
          .textSearch('search_vector', q.trim(), { type: 'websearch' });
        if (!cancelled) setSearchResults((data as Product[]) ?? []);
        setLoading(false);
        return;
      }

      const [{ data: cats }, { data: brs }, { data: newArr }, { data: best }, { data: feat }, { data: more }] = await Promise.all([
        supabase.from('categories').select('*').eq('is_active', true).order('display_order'),
        supabase.from('brands').select('*').eq('is_active', true).order('display_order'),
        supabase
          .from('products')
          .select('*, category:categories(*), brand:brands(*)')
          .eq('is_active', true)
          .eq('is_new_arrival', true)
          .limit(10),
        supabase
          .from('products')
          .select('*, category:categories(*), brand:brands(*)')
          .eq('is_active', true)
          .eq('is_best_seller', true)
          .limit(10),
        supabase
          .from('products')
          .select('*, category:categories(*), brand:brands(*)')
          .eq('is_active', true)
          .eq('is_featured', true)
          .limit(10),
        supabase
          .from('products')
          .select('*, category:categories(*), brand:brands(*)')
          .eq('is_active', true)
          .eq('is_new_arrival', false)
          .eq('is_best_seller', false)
          .eq('is_featured', false)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (!cancelled) {
        setCategories((cats as Category[]) ?? []);
        setBrands((brs as Brand[]) ?? []);
        setNewArrivals((newArr as Product[]) ?? []);
        setBestSellers((best as Product[]) ?? []);
        setFeatured((feat as Product[]) ?? []);
        setMoreProducts((more as Product[]) ?? []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [q]);

  if (loading) return <Loader label="Loading Mobile Bar" />;

  if (q.trim()) {
    return (
      <div className="container-page py-xl">
        <h2 className="text-headline-lg !text-2xl text-on-surface">Results for "{q}"</h2>
        {searchResults.length === 0 ? (
          <div className="card-surface mt-6 flex flex-col items-center gap-2 py-24 text-center">
            <span className="material-symbols-outlined !text-4xl text-outline">search_off</span>
            <p className="text-headline-md !text-lg text-on-surface">No matches yet.</p>
            <p className="max-w-sm text-body-md text-on-surface-variant">Try a broader term — brand, model, or product type.</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {searchResults.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Hero banner */}
      <section className="relative overflow-hidden bg-primary">
        <div className="container-page grid gap-10 py-xl lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="relative z-10">
            <div className="mb-md inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-md">
              <span className="material-symbols-outlined !text-base text-primary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>
                new_releases
              </span>
              <span className="text-caption font-semibold uppercase tracking-wider text-white">New Arrivals Weekly</span>
            </div>
            <h1 className="max-w-lg text-display-lg !text-4xl text-white sm:!text-display-lg">
              Personalize every device you own.
            </h1>
            <p className="mt-md max-w-md text-body-lg text-white/75">
              Covers, skins, tempered glass, watch straps, and cable accessories — premium quality, styled for you,
              fitted to your exact model.
            </p>
            <div className="mt-lg flex gap-3">
              <Link to="/shop/mobile-covers" className="btn-primary !bg-white !text-primary-deep hover:!bg-white/90">
                Shop Now
                <span className="material-symbols-outlined !text-base">arrow_forward</span>
              </Link>
              <Link to="/about" className="btn-secondary !border-white/40 !text-white hover:!bg-white/10">
                Learn More
              </Link>
            </div>
          </div>
          <div className="relative z-10 grid grid-cols-2 gap-3">
            {[
              { icon: 'verified_user', title: 'Secure Payments', desc: 'Encrypted checkout, every order.' },
              { icon: 'local_shipping', title: 'Fast Delivery', desc: '2-7 day dispatch, tracked.' },
              { icon: 'workspace_premium', title: 'Premium Quality', desc: 'Durable, trend-forward designs.' },
              { icon: 'support_agent', title: 'Real Support', desc: 'WhatsApp us, anytime.' },
            ].map((f) => (
              <div key={f.title} className="rounded-lg border border-white/15 bg-white/10 p-md backdrop-blur-md">
                <span className="material-symbols-outlined text-primary-fixed">{f.icon}</span>
                <p className="mt-2 text-label-sm font-semibold text-white">{f.title}</p>
                <p className="mt-0.5 text-caption text-white/65">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shop by category */}
      <section className="container-page py-xl">
        <h2 className="mb-md text-headline-lg !text-2xl text-on-surface">Shop by Category</h2>
        <div className="grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/shop/${c.slug}`}
              className="card-surface group flex flex-col items-center gap-2 p-md text-center transition hover:shadow-2"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white">
                <span className="material-symbols-outlined !text-2xl">{CATEGORY_ICONS[c.slug] ?? 'category'}</span>
              </span>
              <span className="text-label-sm font-semibold text-on-surface">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Shop by brand */}
      <section className="bg-white py-xl">
        <div className="container-page">
          <h2 className="mb-md text-headline-lg !text-2xl text-on-surface">Shop by Brand</h2>
          <div className="flex flex-wrap gap-2.5">
            {brands.map((b) => (
              <Link
                key={b.id}
                to={`/?brand=${b.slug}`}
                className="rounded-full border border-border-soft bg-surface-container-low px-5 py-2.5 text-label-sm font-medium text-on-surface-variant transition hover:border-primary hover:text-primary"
              >
                {b.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ProductRow title="New Arrivals" icon="new_releases" products={newArrivals} />
      <ProductRow title="Best Sellers" icon="local_fire_department" products={bestSellers} />
      <ProductRow title="Featured Picks" icon="star" products={featured} />
      <ProductRow title="More to Explore" icon="apps" products={moreProducts} />

      {filter === 'best_seller' &&
        bestSellers.length === 0 &&
        newArrivals.length === 0 &&
        featured.length === 0 &&
        moreProducts.length === 0 && (
          <div className="container-page py-24 text-center text-on-surface-variant">No products yet — check back soon.</div>
        )}
    </div>
  );
}