import { Link } from 'react-router-dom';

const SHOP_LINKS = [
  { label: 'Mobile Covers', to: '/shop/mobile-covers' },
  { label: 'Mobile Skins', to: '/shop/mobile-skins' },
  { label: 'Tempered Glass', to: '/shop/tempered-glass' },
  { label: 'Watch Straps', to: '/shop/watch-straps' },
];

const SUPPORT_LINKS = [
  { label: 'Contact Us', to: '/contact' },
  { label: 'Shipping Policy', to: '/policies' },
  { label: 'Return & Refund', to: '/policies' },
];

const COMPANY_LINKS = [
  { label: 'About Us', to: '/about' },
  { label: 'Privacy Policy', to: '/policies' },
  { label: 'Terms & Conditions', to: '/policies' },
];

export default function Footer() {
  return (
    <footer className="mt-xl border-t border-border-soft bg-white">
      <div className="container-page grid gap-lg py-xl sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="7" y="2" width="10" height="20" rx="2" stroke="#fff" strokeWidth="1.6" />
                <circle cx="12" cy="18.3" r="0.9" fill="#fff" />
              </svg>
            </span>
            <span className="text-label-sm font-semibold text-on-surface">Mobile Bar</span>
          </div>
          <p className="mt-3 text-caption text-on-surface-variant">
            Premium-quality mobile accessories — stylish, durable, and affordable.
          </p>
        </div>

        <div>
          <p className="text-caption font-semibold uppercase tracking-wide text-on-surface">Shop</p>
          <ul className="mt-3 space-y-2">
            {SHOP_LINKS.map((l) => (
              <li key={l.label}>
                <Link to={l.to} className="text-caption text-on-surface-variant hover:text-primary">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-caption font-semibold uppercase tracking-wide text-on-surface">Support</p>
          <ul className="mt-3 space-y-2">
            {SUPPORT_LINKS.map((l) => (
              <li key={l.label}>
                <Link to={l.to} className="text-caption text-on-surface-variant hover:text-primary">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-caption font-semibold uppercase tracking-wide text-on-surface">Company</p>
          <ul className="mt-3 space-y-2">
            {COMPANY_LINKS.map((l) => (
              <li key={l.label}>
                <Link to={l.to} className="text-caption text-on-surface-variant hover:text-primary">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-border-soft py-5">
        <p className="container-page text-caption text-on-surface-variant">
          © {new Date().getFullYear()} Mobile Bar. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
