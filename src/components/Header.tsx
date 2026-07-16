import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { Category } from '@/types';

export default function Header() {
  const { session, profile, logout } = useAuth();
  const { totalItems } = useCart();
  const { items: wishlistItems } = useWishlist();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [categories, setCategories] = useState<Category[]>([]);
  const [shopOpen, setShopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const shopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .then(({ data }) => setCategories((data as Category[]) ?? []));
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (shopRef.current && !shopRef.current.contains(e.target as Node)) setShopOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate(query.trim() ? `/?q=${encodeURIComponent(query.trim())}` : '/');
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border-soft bg-surface/90 backdrop-blur-md">
      <div className="container-page flex h-20 items-center gap-6">
        <button className="md:hidden" onClick={() => setMobileOpen((o) => !o)}>
          <span className="material-symbols-outlined text-on-surface">{mobileOpen ? 'close' : 'menu'}</span>
        </button>

        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="7" y="2" width="10" height="20" rx="2" stroke="#fff" strokeWidth="1.6" />
              <circle cx="12" cy="18.3" r="0.9" fill="#fff" />
            </svg>
          </span>
          <span className="text-headline-md font-semibold tracking-tight text-on-surface">Mobile Bar</span>
        </Link>

        {/* Desktop nav + mega menu */}
        <nav className="hidden items-center gap-1 lg:flex">
          <div ref={shopRef} className="relative">
            <button
              onClick={() => setShopOpen((o) => !o)}
              className="btn-ghost flex items-center gap-1"
            >
              Shop
              <span className="material-symbols-outlined !text-base">{shopOpen ? 'expand_less' : 'expand_more'}</span>
            </button>
            {shopOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 rounded-lg border border-border-soft bg-white p-2 shadow-3">
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    to={`/shop/${c.slug}`}
                    onClick={() => setShopOpen(false)}
                    className="block rounded-md px-3 py-2 text-label-sm text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link to="/?filter=best_seller" className="btn-ghost">
            Best Sellers
          </Link>
          <Link to="/about" className="btn-ghost">
            About Us
          </Link>
          <Link to="/contact" className="btn-ghost">
            Contact
          </Link>
        </nav>

        <form onSubmit={handleSearch} className="hidden flex-1 items-center md:flex">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-outline">
              search
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search product, model, brand…"
              className="input-field bg-white pl-10"
            />
          </div>
        </form>

        <nav className="ml-auto flex items-center gap-1">
          <Link to="/wishlist" className="btn-ghost relative">
            <span className="material-symbols-outlined">favorite</span>
            {wishlistItems.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-on-primary">
                {wishlistItems.length}
              </span>
            )}
          </Link>
          <Link to="/cart" className="btn-ghost relative">
            <span className="material-symbols-outlined">shopping_bag</span>
            {totalItems > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-on-primary">
                {totalItems}
              </span>
            )}
          </Link>

          {session ? (
            <div className="group relative">
              <Link to="/profile" className="btn-ghost flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container text-label-sm font-semibold text-on-secondary-container">
                  {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
                </span>
              </Link>
              <button
                onClick={() => logout()}
                className="absolute right-0 top-full mt-1 hidden whitespace-nowrap rounded-lg border border-border-soft bg-white px-3 py-1.5 text-label-sm text-on-surface-variant shadow-2 hover:text-error group-hover:block"
              >
                Log out
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn-primary !hidden sm:!inline-flex">
              Login
            </Link>
          )}
        </nav>
      </div>

      <form onSubmit={handleSearch} className="container-page flex pb-3 md:hidden">
        <div className="relative w-full">
          <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-outline">
            search
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Search product, model, brand…"
            className="input-field bg-white pl-10"
          />
        </div>
      </form>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-border-soft bg-white lg:hidden">
          <nav className="container-page flex flex-col py-3">
            <p className="px-2 py-1.5 text-caption font-semibold uppercase tracking-wide text-on-surface-variant">Shop</p>
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/shop/${c.slug}`}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-2 py-2 text-label-sm text-on-surface hover:bg-surface-container-low"
              >
                {c.name}
              </Link>
            ))}
            <div className="my-2 border-t border-border-soft" />
            <Link to="/about" onClick={() => setMobileOpen(false)} className="rounded-md px-2 py-2 text-label-sm text-on-surface hover:bg-surface-container-low">
              About Us
            </Link>
            <Link to="/contact" onClick={() => setMobileOpen(false)} className="rounded-md px-2 py-2 text-label-sm text-on-surface hover:bg-surface-container-low">
              Contact
            </Link>
            <Link to="/policies" onClick={() => setMobileOpen(false)} className="rounded-md px-2 py-2 text-label-sm text-on-surface hover:bg-surface-container-low">
              Policies
            </Link>
            {!session && (
              <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-primary mt-3 justify-center">
                Login / Register
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
