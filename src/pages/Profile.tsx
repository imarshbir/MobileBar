import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { Order } from '@/types';
import Loader from '@/components/Loader';

const formatPrice = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const STATUS_STYLES: Record<string, string> = {
  pending: 'text-amber-700 bg-amber-50 border border-amber-200',
  confirmed: 'text-primary bg-primary/10 border border-primary/20',
  shipped: 'text-primary bg-primary/10 border border-primary/20',
  delivered: 'text-on-surface-variant bg-surface-container-low border border-border-soft',
  cancelled: 'text-error bg-error-container border border-error/20',
};

export default function Profile() {
  const { profile, session, logout, refreshProfile } = useAuth();
  const { push } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: '', shipping_address: '', mobile_number: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', session.user.id)
        .order('created_at', { ascending: false });
      setOrders((data as Order[]) ?? []);
      setLoading(false);
    })();
  }, [session?.user]);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name,
        shipping_address: profile.shipping_address,
        mobile_number: profile.mobile_number ?? '',
      });
    }
  }, [profile]);

  const MOBILE_RE = /^[0-9+][0-9 -]{6,14}$/;

  const saveProfile = async () => {
    if (!session?.user) return;
    setFormError(null);

    const trimmedMobile = form.mobile_number.trim();
    if (trimmedMobile && !MOBILE_RE.test(trimmedMobile)) {
      setFormError('Enter a valid mobile number, or leave it blank.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name.trim(),
        shipping_address: form.shipping_address.trim(),
        mobile_number: trimmedMobile || null,
      })
      .eq('id', session.user.id);
    setSaving(false);
    if (error) {
      // Most likely cause: that number is already used by another account
      // (mobile_number is UNIQUE) — surface that plainly instead of a
      // generic failure.
      const msg = error.message.includes('duplicate') || error.code === '23505'
        ? 'That mobile number is already linked to another account.'
        : 'Could not update profile.';
      push(msg, 'error');
      return;
    }
    await refreshProfile();
    setEditing(false);
    push('Profile updated.', 'success');
  };

  if (!profile) return <Loader label="Loading profile" />;

  return (
    <div className="container-page py-xl">
      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <div className="card-surface h-fit p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-headline-md !text-lg text-white">
              {profile.full_name?.[0]?.toUpperCase()}
            </span>
            <div>
              <p className="text-headline-md !text-base font-semibold text-on-surface">{profile.full_name}</p>
              <p className="text-caption text-on-surface-variant">{profile.email}</p>
            </div>
          </div>

          {editing ? (
            <div className="mt-5 flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-caption text-on-surface-variant">Full name</label>
                <input
                  className="input-field bg-white"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-caption text-on-surface-variant">Mobile number</label>
                <input
                  className="input-field bg-white"
                  value={form.mobile_number}
                  onChange={(e) => setForm((f) => ({ ...f, mobile_number: e.target.value }))}
                  placeholder="9876543210"
                />
              </div>
              {formError && (
                <p className="flex items-center gap-1.5 rounded-lg bg-error-container px-3 py-2 text-caption text-on-error-container">
                  <span className="material-symbols-outlined !text-base">error</span>
                  {formError}
                </p>
              )}
              <div>
                <label className="mb-1 block text-caption text-on-surface-variant">Shipping address</label>
                <textarea
                  className="input-field resize-none bg-white"
                  rows={2}
                  value={form.shipping_address}
                  onChange={(e) => setForm((f) => ({ ...f, shipping_address: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={saveProfile} disabled={saving} className="btn-primary flex-1 !text-caption">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setEditing(false)} className="btn-secondary flex-1 !text-caption">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-3 text-body-md">
              <div>
                <p className="text-caption text-on-surface-variant">Mobile number</p>
                <p className="text-on-surface">{profile.mobile_number || 'Not set'}</p>
              </div>
              <div>
                <p className="text-caption text-on-surface-variant">Shipping address</p>
                <p className="text-on-surface">{profile.shipping_address || 'Not set'}</p>
              </div>
              <button onClick={() => setEditing(true)} className="btn-secondary mt-2 !text-caption">
                Edit details
              </button>
            </div>
          )}

          <button onClick={() => logout()} className="mt-4 flex w-full items-center justify-center gap-1.5 text-caption text-on-surface-variant hover:text-error">
            <span className="material-symbols-outlined !text-base">logout</span>
            Log out
          </button>
        </div>

        <div>
          <h2 className="text-headline-lg !text-2xl text-on-surface">Order history</h2>

          {loading ? (
            <Loader label="Loading orders" />
          ) : orders.length === 0 ? (
            <p className="mt-4 text-body-md text-on-surface-variant">No orders yet.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {orders.map((o) => (
                <div key={o.id} className="card-surface flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-label-sm font-semibold text-on-surface">{o.product_name}</p>
                    <p className="mt-0.5 text-caption text-on-surface-variant">
                      Qty {o.quantity} · {new Date(o.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-on-surface">{formatPrice(o.total_price)}</span>
                    <span className={`rounded-full px-2.5 py-1 text-caption font-semibold uppercase ${STATUS_STYLES[o.status]}`}>
                      {o.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}