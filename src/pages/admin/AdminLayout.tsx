import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const links = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/admin/products', label: 'Inventory', icon: 'inventory_2' },
  { to: '/admin/orders', label: 'Orders', icon: 'receipt_long' },
  { to: '/admin/coupons', label: 'Coupons', icon: 'sell' },
];

export default function AdminLayout() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  // Previously the sidebar was `hidden md:flex` — below 768px it had no
  // toggle at all, so admin nav was completely inaccessible on mobile.
  // This single boolean now drives the sidebar on every screen size:
  // a persistent hamburger button opens/closes it, and a backdrop click
  // closes it too.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/admin');
  };

  return (
    <div className="h-screen overflow-hidden bg-surface-bright">
      {/* Top bar — always visible, holds the hamburger toggle */}
      <header className="flex h-14 items-center gap-3 border-b border-outline-variant bg-surface-container px-4 shadow-1">
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface hover:bg-surface-container-high"
          aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
        >
          <span className="material-symbols-outlined">{sidebarOpen ? 'close' : 'menu'}</span>
        </button>
        <div>
          <p className="text-label-sm font-bold leading-tight text-primary">Admin Panel</p>
          <p className="text-caption leading-tight text-on-surface-variant opacity-70">Management Console</p>
        </div>
      </header>

      <div className="relative flex h-[calc(100vh-56px)]">
        {/* Backdrop — click outside to close, mirrors the customer header's mobile drawer pattern */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-secondary/40" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
        )}

        <aside
          className={`fixed left-0 top-14 z-40 flex h-[calc(100vh-56px)] w-64 flex-col bg-surface-container p-md shadow-2 transition-transform duration-200 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="flex flex-1 flex-col space-y-base">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-sm rounded-lg px-md py-sm text-label-sm transition-all ${
                    isActive
                      ? 'translate-x-1 bg-primary text-white font-semibold shadow-1'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`
                }
              >
                <span className="material-symbols-outlined">{l.icon}</span>
                <span>{l.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto flex items-center gap-sm border-t border-outline-variant px-base pt-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-white">
              {profile?.full_name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-label-sm font-bold text-on-surface">{profile?.full_name ?? 'Admin User'}</span>
              <span className="truncate text-caption text-on-surface-variant">{profile?.email}</span>
            </div>
            <button onClick={handleLogout} className="text-on-surface-variant hover:text-error" title="Log out">
              <span className="material-symbols-outlined !text-lg">logout</span>
            </button>
          </div>
        </aside>

        <main className="h-full flex-1 overflow-y-auto">
          <div className="p-5 md:p-xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}