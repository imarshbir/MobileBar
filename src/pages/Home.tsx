import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Product } from '@/types';
import ProductCard from '@/components/ProductCard';
import Loader from '@/components/Loader';

const BRAND_FILTERS = ['All', 'Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi'];
type SortKey = 'newest' | 'price_asc' | 'price_desc';

export default function Home() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState('All');
  const [sort, setSort] = useState<SortKey>('newest');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let query = supabase.from('products').select('*').eq('is_active', true);

      if (q.trim()) {
        query = query.textSearch('search_vector', q.trim(), { type: 'websearch' });
      }
      if (brand !== 'All') {
        query = query.eq('brand', brand);
      }
      if (sort === 'price_asc') query = query.order('price', { ascending: true });
      else if (sort === 'price_desc') query = query.order('price', { ascending: false });
      else query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (!cancelled) {
        if (!error) setProducts((data as Product[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, brand, sort]);

  const heading = useMemo(() => (q ? `Results for "${q}"` : 'The Collection'), [q]);

  return (
    <div>
      {!q && (
        <section className="relative overflow-hidden bg-primary">
          <div className="container-page grid gap-10 py-xl lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-xl">
            <div className="relative z-10">
              <div className="mb-md inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-md">
                <span className="material-symbols-outlined !text-base text-primary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified
                </span>
                <span className="text-caption font-semibold uppercase tracking-wider text-white">Precision &amp; Prestige</span>
              </div>
              <h1 className="max-w-lg text-display-lg !text-4xl text-white sm:!text-display-lg">
                The sanctuary of precision engineering.
              </h1>
              <p className="mt-md max-w-md text-body-lg text-white/75">
                Every phone on this shelf is chosen for its spec sheet, not just its box art. Compare processor,
                storage, and price — then order with confidence.
              </p>
            </div>
            <div className="relative z-10 grid grid-cols-2 gap-3">
              {[
                { icon: 'verified_user', title: 'Secured Prestige', desc: 'Encrypted, RLS-protected checkout.' },
                { icon: 'local_shipping', title: 'Priority Logistics', desc: 'Tracked delivery, every order.' },
                { icon: 'memory', title: 'Full Spec Sheets', desc: 'RAM, chipset, storage — up front.' },
                { icon: 'support_agent', title: 'Verified Reviews', desc: 'Feedback from real buyers.' },
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
      )}

      <section className="container-page py-xl">
        <div className="mb-md flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-headline-lg !text-2xl text-on-surface">{heading}</h2>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="input-field w-auto bg-white !py-2 text-label-sm"
          >
            <option value="newest">Newest first</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>

        <div className="mb-lg flex flex-wrap gap-2">
          {BRAND_FILTERS.map((b) => (
            <button
              key={b}
              onClick={() => setBrand(b)}
              className={`rounded-full border px-4 py-1.5 text-label-sm font-medium transition ${
                brand === b
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border-soft bg-white text-on-surface-variant hover:border-outline'
              }`}
            >
              {b}
            </button>
          ))}
        </div>

        {loading ? (
          <Loader label="Loading collection" />
        ) : products.length === 0 ? (
          <div className="card-surface flex flex-col items-center gap-2 py-24 text-center">
            <span className="material-symbols-outlined !text-4xl text-outline">search_off</span>
            <p className="text-headline-md !text-lg text-on-surface">No phones match that yet.</p>
            <p className="max-w-sm text-body-md text-on-surface-variant">
              Try a different brand filter or clear your search — new stock lands regularly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
