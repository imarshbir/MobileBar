import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const links = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/admin/products', label: 'Inventory', icon: 'inventory_2' },
  { to: '/admin/orders', label: 'Orders', icon: 'receipt_long' },
];

export default function AdminLayout() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface-bright">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col bg-surface-container p-md shadow-2 md:flex">
        <div className="mb-xl px-base">
          <h1 className="text-headline-md font-bold text-primary">Admin Panel</h1>
          <p className="text-label-sm text-on-surface-variant opacity-70">Management Console</p>
        </div>

        <nav className="flex flex-1 flex-col space-y-base">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
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

      <main className="h-full flex-1 overflow-y-auto md:ml-64">
        <div className="p-5 md:p-xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
