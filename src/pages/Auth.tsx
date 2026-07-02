import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';

type Tab = 'login' | 'register';

const VALUE_PROPS = [
  { icon: 'verified_user', title: 'Secured Prestige', desc: 'Row-level security on every transaction.' },
  { icon: 'local_shipping', title: 'Priority Logistics', desc: 'White-glove delivery to your doorstep.' },
];

export default function Auth({ initialTab }: { initialTab: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const { login, register } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  // Login state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  // Register state
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    shippingAddress: '',
    password: '',
    confirmPassword: '',
  });
  const [regError, setRegError] = useState<string | null>(null);
  const [regBusy, setRegBusy] = useState(false);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginBusy(true);
    const { error } = await login(identifier, password);
    setLoginBusy(false);
    if (error) {
      setLoginError(error);
      return;
    }
    push('Welcome back!', 'success');
    navigate(from, { replace: true });
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setRegError(null);
    if (form.password !== form.confirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }
    setRegBusy(true);
    const { error } = await register(form);
    setRegBusy(false);
    if (error) {
      setRegError(error);
      return;
    }
    push('Account created — check your inbox to confirm your email, then sign in.', 'success');
    setTab('login');
  };

  return (
    <main className="grid min-h-screen grid-cols-1 overflow-hidden md:grid-cols-12">
      {/* Left: brand panel */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-primary p-xl md:col-span-5 md:flex lg:col-span-4">
        <div className="relative z-10">
          <Link to="/" className="mb-md inline-flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="7" y="2" width="10" height="20" rx="2" stroke="#fff" strokeWidth="1.6" />
                <circle cx="12" cy="18.3" r="0.9" fill="#fff" />
              </svg>
            </span>
            <span className="text-headline-md font-semibold text-white">Mobile Bar</span>
          </Link>
          <h1 className="mb-md mt-lg text-display-lg !text-[40px] text-white">Mobile Bar</h1>
          <p className="max-w-sm text-body-lg text-white/75">
            Enter the sanctuary of precision engineering. Experience the pinnacle of mobile technology, curated for
            the connoisseur.
          </p>
        </div>

        <div className="relative z-10 space-y-lg">
          {VALUE_PROPS.map((v) => (
            <div key={v.title} className="group flex items-start gap-md">
              <div className="rounded-lg bg-primary-deep p-sm text-primary-fixed shadow-1 transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined">{v.icon}</span>
              </div>
              <div>
                <h3 className="text-headline-md !text-[18px] leading-tight text-white">{v.title}</h3>
                <p className="text-label-sm text-white/70">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 pt-xl">
          <div className="rounded-xl border border-white/20 bg-white/10 p-md backdrop-blur-md">
            <p className="mb-base text-body-md italic text-white">
              "The interface is as premium as the hardware they sell."
            </p>
            <div className="flex items-center gap-base">
              <div className="h-8 w-8 rounded-full bg-secondary-container" />
              <span className="text-label-sm text-white/90">Julian Vance, Tech Enthusiast</span>
            </div>
          </div>
        </div>
      </section>

      {/* Right: forms */}
      <section className="relative col-span-1 flex items-center justify-center bg-surface p-gutter md:col-span-7 lg:col-span-8">
        <div className="w-full max-w-lg py-xl">
          <div className="mb-xl flex justify-center">
            <div className="flex items-center gap-xs rounded-full bg-surface-container-high px-md py-xs shadow-1">
              <span className="material-symbols-outlined !text-[20px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                lock
              </span>
              <span className="text-label-sm uppercase tracking-wider text-primary">End-to-End Secure</span>
            </div>
          </div>

          <div className="mb-xl flex border-b border-outline-variant">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 border-b-2 py-base text-center text-label-sm transition-all ${
                tab === 'login' ? 'border-primary font-semibold text-primary-deep' : 'border-transparent text-on-surface-variant hover:text-primary'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setTab('register')}
              className={`flex-1 border-b-2 py-base text-center text-label-sm transition-all ${
                tab === 'register' ? 'border-primary font-semibold text-primary-deep' : 'border-transparent text-on-surface-variant hover:text-primary'
              }`}
            >
              Register
            </button>
          </div>

          {tab === 'login' ? (
            <div className="space-y-md">
              <div className="mb-lg text-center">
                <h2 className="text-headline-lg !text-2xl text-on-surface">Welcome Back</h2>
                <p className="text-body-md text-on-surface-variant">Access your premium collection</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-md">
                <div className="group">
                  <label className="mb-xs block text-label-sm text-on-surface-variant group-focus-within:text-primary">
                    Email or Mobile Number
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline-variant">
                      person
                    </span>
                    <input
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="input-field bg-white pl-[52px]"
                      placeholder="name@domain.com"
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="mb-xs block text-label-sm text-on-surface-variant group-focus-within:text-primary">Password</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline-variant">
                      lock
                    </span>
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? 'text' : 'password'}
                      className="input-field bg-white pl-[52px] pr-11"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-md top-1/2 -translate-y-1/2 text-outline-variant hover:text-on-surface"
                    >
                      <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                {loginError && (
                  <p className="flex items-center gap-1.5 rounded-lg bg-error-container px-3 py-2 text-label-sm text-on-error-container">
                    <span className="material-symbols-outlined !text-base">error</span>
                    {loginError}
                  </p>
                )}

                <button type="submit" disabled={loginBusy} className="btn-primary w-full !py-4 !text-headline-md !text-[16px]">
                  {loginBusy ? 'Signing in…' : 'Secure Login'}
                  <span className="material-symbols-outlined !text-base">arrow_forward</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-md">
              <div className="mb-lg text-center">
                <h2 className="text-headline-lg !text-2xl text-on-surface">Create Account</h2>
                <p className="text-body-md text-on-surface-variant">Join the exclusive circle</p>
              </div>

              <form onSubmit={handleRegister} className="grid grid-cols-1 gap-x-md gap-y-base md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-xs block text-label-sm text-on-surface-variant">Full Name</label>
                  <input className="input-field bg-white" value={form.fullName} onChange={update('fullName')} placeholder="John Doe" required />
                </div>
                <div>
                  <label className="mb-xs block text-label-sm text-on-surface-variant">Email Address</label>
                  <input
                    className="input-field bg-white"
                    type="email"
                    value={form.email}
                    onChange={update('email')}
                    placeholder="john@doe.com"
                    autoComplete="email"
                    required
                  />
                </div>
                <div>
                  <label className="mb-xs block text-label-sm text-on-surface-variant">Mobile Number</label>
                  <input
                    className="input-field bg-white"
                    value={form.mobileNumber}
                    onChange={update('mobileNumber')}
                    placeholder="9876543210"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-xs block text-label-sm text-on-surface-variant">Shipping Address</label>
                  <textarea
                    className="input-field resize-none bg-white"
                    rows={2}
                    value={form.shippingAddress}
                    onChange={update('shippingAddress')}
                    placeholder="123 Luxury Lane, Suite 100"
                    required
                  />
                </div>
                <div>
                  <label className="mb-xs block text-label-sm text-on-surface-variant">Password</label>
                  <input
                    className="input-field bg-white"
                    type="password"
                    value={form.password}
                    onChange={update('password')}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div>
                  <label className="mb-xs block text-label-sm text-on-surface-variant">Confirm Password</label>
                  <input
                    className="input-field bg-white"
                    type="password"
                    value={form.confirmPassword}
                    onChange={update('confirmPassword')}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                </div>
                <p className="md:col-span-2 -mt-1 text-caption text-on-surface-variant">
                  At least 8 characters, one uppercase letter, one number.
                </p>

                {regError && (
                  <p className="md:col-span-2 flex items-center gap-1.5 rounded-lg bg-error-container px-3 py-2 text-label-sm text-on-error-container">
                    <span className="material-symbols-outlined !text-base">error</span>
                    {regError}
                  </p>
                )}

                <button type="submit" disabled={regBusy} className="btn-primary md:col-span-2 mt-2 w-full !py-4">
                  {regBusy ? 'Creating account…' : 'Create account'}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
