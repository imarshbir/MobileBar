import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';

export default function Header() {
  const { session, profile, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate(query.trim() ? `/?q=${encodeURIComponent(query.trim())}` : '/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border-soft bg-surface/90 backdrop-blur-md">
      <div className="container-page flex h-20 items-center gap-6">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="7" y="2" width="10" height="20" rx="2" stroke="#fff" strokeWidth="1.6" />
              <circle cx="12" cy="18.3" r="0.9" fill="#fff" />
            </svg>
          </span>
          <span className="text-headline-md font-semibold tracking-tight text-on-surface">Mobile Bar</span>
        </Link>

        <form onSubmit={handleSearch} className="hidden flex-1 items-center md:flex">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-outline">
              search
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search brand, model, spec…"
              className="input-field bg-white pl-10"
            />
          </div>
        </form>

        <nav className="ml-auto flex items-center gap-1.5">
          <Link to="/cart" className="btn-ghost relative">
            <span className="material-symbols-outlined">shopping_bag</span>
            <span className="hidden sm:inline text-label-sm">Cart</span>
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
                <span className="hidden max-w-[100px] truncate text-label-sm sm:inline">{profile?.full_name ?? 'Profile'}</span>
              </Link>
              <button
                onClick={() => logout()}
                className="absolute right-0 top-full mt-1 hidden whitespace-nowrap rounded-lg border border-border-soft bg-white px-3 py-1.5 text-label-sm text-on-surface-variant shadow-2 hover:text-error group-hover:block"
              >
                Log out
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn-primary">
              Login / Register
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
            placeholder="Search brand, model, spec…"
            className="input-field bg-white pl-10"
          />
        </div>
      </form>
    </header>
  );
}
