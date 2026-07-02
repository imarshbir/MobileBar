import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// This screen is intentionally not linked from the header, footer, or
// any customer-facing page. It is only reachable by typing /admin in
// the address bar. It authenticates through the exact same Supabase
// Auth flow as customers — admin powers come only from the database
// profiles.is_admin flag, enforced by RLS (see supabase/schema.sql).
export default function AdminLogin() {
  const { session, isAdmin, login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session && isAdmin) navigate('/admin/dashboard', { replace: true });
  }, [loading, session, isAdmin, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await login(email, password);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    setTimeout(() => navigate('/admin/dashboard'), 300);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-3">
        <div className="mb-1 flex items-center gap-2">
          <span className="material-symbols-outlined !text-lg text-primary">admin_panel_settings</span>
          <p className="text-caption font-semibold uppercase tracking-widest text-on-surface-variant">Restricted area</p>
        </div>
        <h1 className="text-headline-lg !text-2xl text-on-surface">Admin console</h1>
        <p className="mt-1 text-body-md text-on-surface-variant">Mobile Bar staff only.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-label-sm text-on-surface-variant">Admin email</label>
            <input
              className="input-field bg-white"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-label-sm text-on-surface-variant">Password</label>
            <input
              className="input-field bg-white"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <p className="flex items-center gap-1.5 rounded-lg bg-error-container px-3 py-2 text-label-sm text-on-error-container">
              <span className="material-symbols-outlined !text-base">error</span>
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className="btn-primary w-full !py-3.5">
            {busy ? 'Verifying…' : 'Enter console'}
          </button>
        </form>
      </div>
    </div>
  );
}
