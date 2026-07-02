import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Loader from './Loader';

// This guard is a UX convenience only — it hides admin screens from the
// nav/router for non-admins. The actual security boundary is enforced
// server-side by Postgres Row Level Security (see supabase/schema.sql,
// the is_admin() function and the *_admin_write policies). Even if
// someone bypassed this component entirely, Supabase would still refuse
// every privileged read/write for a non-admin JWT.
export default function AdminRoute({ children }: { children: ReactNode }) {
  const { session, profile, loading, isAdmin } = useAuth();

  if (loading) return <Loader label="Verifying admin access" />;
  if (!session || !profile) return <Navigate to="/admin" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
