import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { Profile } from '@/types';

interface RegisterInput {
  fullName: string;
  email: string;
  mobileNumber: string;
  shippingAddress: string;
  password: string;
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  register: (input: RegisterInput) => Promise<{ error: string | null }>;
  login: (identifier: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Very small guard against brute-forcing the login form from the browser.
// This is a UX speed bump only — the real defence is Supabase Auth's own
// rate limiting on the server. Never rely on client-side throttling alone.
const LOGIN_ATTEMPT_KEY = 'mb_login_attempts';
const MAX_ATTEMPTS = 6;
const WINDOW_MS = 5 * 60 * 1000;

function checkClientRateLimit(): boolean {
  try {
    const raw = localStorage.getItem(LOGIN_ATTEMPT_KEY);
    const attempts: number[] = raw ? JSON.parse(raw) : [];
    const recent = attempts.filter((t) => Date.now() - t < WINDOW_MS);
    return recent.length < MAX_ATTEMPTS;
  } catch {
    return true;
  }
}

function recordLoginAttempt() {
  try {
    const raw = localStorage.getItem(LOGIN_ATTEMPT_KEY);
    const attempts: number[] = raw ? JSON.parse(raw) : [];
    const recent = attempts.filter((t) => Date.now() - t < WINDOW_MS);
    recent.push(Date.now());
    localStorage.setItem(LOGIN_ATTEMPT_KEY, JSON.stringify(recent));
  } catch {
    /* ignore storage errors */
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^[0-9+][0-9 -]{6,14}$/;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile((data as Profile) ?? null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) await loadProfile(session.user.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        await loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const register = async ({ fullName, email, mobileNumber, shippingAddress, password }: RegisterInput) => {
    if (!fullName.trim()) return { error: 'Full name is required.' };
    if (!EMAIL_RE.test(email)) return { error: 'Enter a valid email address.' };
    if (!MOBILE_RE.test(mobileNumber)) return { error: 'Enter a valid mobile number.' };
    if (!shippingAddress.trim()) return { error: 'Shipping address is required.' };
    if (password.length < 8) return { error: 'Password must be at least 8 characters.' };
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return { error: 'Password needs at least one uppercase letter and one number.' };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          mobile_number: mobileNumber.trim(),
          shipping_address: shippingAddress.trim(),
        },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        return { error: 'An account with this email already exists.' };
      }
      return { error: error.message };
    }
    return { error: null };
  };

  const login = async (identifier: string, password: string) => {
    if (!checkClientRateLimit()) {
      return { error: 'Too many login attempts. Please wait a few minutes and try again.' };
    }

    let email = identifier.trim();

    // Allow login via mobile number by resolving it to an email first.
    if (!EMAIL_RE.test(identifier)) {
      const { data, error: lookupError } = await supabase
        .from('profiles')
        .select('email')
        .eq('mobile_number', identifier.trim())
        .maybeSingle();

      if (lookupError || !data) {
        recordLoginAttempt();
        return { error: 'Invalid credentials.' };
      }
      email = data.email;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    recordLoginAttempt();

    if (error) {
      // Deliberately generic message — never reveal whether the email
      // exists or the password was wrong, to avoid account enumeration.
      return { error: 'Invalid credentials.' };
    }
    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  const value: AuthContextValue = {
    session,
    profile,
    loading,
    isAdmin: !!profile?.is_admin,
    register,
    login,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
