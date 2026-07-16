import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Coupon } from '@/types';
import { useToast } from '@/components/Toast';
import Loader from '@/components/Loader';

const formatPrice = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const emptyForm = {
  code: '',
  discount_type: 'percent' as 'percent' | 'flat',
  discount_value: 10,
  requireMinOrder: false,
  min_order_value: 0,
  hasExpiry: false,
  expires_at: '',
  hasUsageLimit: false,
  usage_limit: 100,
  is_active: true,
};

export default function AdminCoupons() {
  const { push } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadCoupons = async () => {
    setLoading(true);
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    setCoupons((data as Coupon[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditingId(c.id);
    setForm({
      code: c.code,
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      requireMinOrder: c.min_order_value > 0,
      min_order_value: c.min_order_value,
      hasExpiry: !!c.expires_at,
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : '',
      hasUsageLimit: c.usage_limit !== null,
      usage_limit: c.usage_limit ?? 100,
      is_active: c.is_active,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const code = form.code.trim().toUpperCase();
    if (!code) {
      push('Enter a coupon code.', 'error');
      return;
    }
    if (form.discount_value <= 0 || (form.discount_type === 'percent' && form.discount_value > 100)) {
      push('Enter a valid discount value (1-100 for a percentage).', 'error');
      return;
    }

    setSaving(true);
    const payload = {
      code,
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      // Optional, per the request: only enforce a minimum order value
      // if the admin explicitly turns it on. Otherwise 0 = no minimum.
      min_order_value: form.requireMinOrder ? form.min_order_value : 0,
      expires_at: form.hasExpiry && form.expires_at ? new Date(form.expires_at + 'T23:59:59').toISOString() : null,
      usage_limit: form.hasUsageLimit ? form.usage_limit : null,
      is_active: form.is_active,
    };

    const { error } = editingId
      ? await supabase.from('coupons').update(payload).eq('id', editingId)
      : await supabase.from('coupons').insert(payload);

    setSaving(false);
    if (error) {
      // Most likely cause: that code already exists (coupons.code is UNIQUE).
      const msg = error.code === '23505' ? 'A coupon with this code already exists.' : `Could not save coupon: ${error.message}`;
      push(msg, 'error');
      return;
    }
    push(editingId ? 'Coupon updated.' : 'Coupon created.', 'success');
    setModalOpen(false);
    loadCoupons();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon permanently?')) return;
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (error) {
      push('Could not delete coupon.', 'error');
      return;
    }
    push('Coupon deleted.', 'success');
    loadCoupons();
  };

  const toggleActive = async (c: Coupon) => {
    await supabase.from('coupons').update({ is_active: !c.is_active }).eq('id', c.id);
    loadCoupons();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg text-on-surface">Coupons</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">Create and manage discount codes for checkout.</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <span className="material-symbols-outlined !text-base">add</span>
          New coupon
        </button>
      </div>

      {loading ? (
        <Loader label="Loading coupons" />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border-soft bg-white shadow-1">
          <table className="w-full text-left text-body-md">
            <thead className="bg-surface-container-low text-caption uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Min. order</th>
                <th className="px-4 py-3">Usage</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft">
              {coupons.map((c) => (
                <tr key={c.id} className="text-on-surface">
                  <td className="px-4 py-3 font-mono text-label-sm font-semibold">{c.code}</td>
                  <td className="px-4 py-3">{c.discount_type === 'percent' ? `${c.discount_value}%` : formatPrice(c.discount_value)}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{c.min_order_value > 0 ? formatPrice(c.min_order_value) : 'None'}</td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {c.times_used}
                    {c.usage_limit !== null ? ` / ${c.usage_limit}` : ''}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(c)}
                      className={`rounded-full px-3 py-1 text-caption font-semibold ${
                        c.is_active ? 'bg-primary/10 text-primary' : 'bg-surface-container-low text-on-surface-variant'
                      }`}
                    >
                      {c.is_active ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(c)} className="mr-2 text-on-surface-variant hover:text-primary" title="Edit">
                      <span className="material-symbols-outlined !text-lg">edit</span>
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="text-on-surface-variant hover:text-error" title="Delete">
                      <span className="material-symbols-outlined !text-lg">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {coupons.length === 0 && <p className="p-6 text-center text-body-md text-on-surface-variant">No coupons yet.</p>}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-secondary/50 p-4" onClick={() => setModalOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-headline-md !text-lg text-on-surface">{editingId ? 'Edit coupon' : 'New coupon'}</h2>

            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-caption text-on-surface-variant">Coupon code</label>
                <input
                  className="input-field bg-white font-mono uppercase"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="WELCOME10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-caption text-on-surface-variant">Discount type</label>
                  <select
                    className="input-field bg-white"
                    value={form.discount_type}
                    onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value as 'percent' | 'flat' }))}
                  >
                    <option value="percent">Percentage off</option>
                    <option value="flat">Flat amount off (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-caption text-on-surface-variant">
                    {form.discount_type === 'percent' ? 'Discount %' : 'Discount (₹)'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={form.discount_type === 'percent' ? 100 : undefined}
                    className="input-field bg-white"
                    value={form.discount_value}
                    onChange={(e) => setForm((f) => ({ ...f, discount_value: Number(e.target.value) }))}
                  />
                </div>
              </div>

              {/* Optional: minimum order value */}
              <div className="rounded-lg border border-border-soft p-3">
                <label className="flex items-center gap-2 text-label-sm text-on-surface">
                  <input
                    type="checkbox"
                    checked={form.requireMinOrder}
                    onChange={(e) => setForm((f) => ({ ...f, requireMinOrder: e.target.checked }))}
                    className="h-4 w-4 accent-primary"
                  />
                  Require a minimum order value
                </label>
                {form.requireMinOrder && (
                  <input
                    type="number"
                    min={0}
                    className="input-field mt-2 bg-white"
                    value={form.min_order_value}
                    onChange={(e) => setForm((f) => ({ ...f, min_order_value: Number(e.target.value) }))}
                    placeholder="Minimum cart total (₹)"
                  />
                )}
              </div>

              {/* Optional: expiry date */}
              <div className="rounded-lg border border-border-soft p-3">
                <label className="flex items-center gap-2 text-label-sm text-on-surface">
                  <input
                    type="checkbox"
                    checked={form.hasExpiry}
                    onChange={(e) => setForm((f) => ({ ...f, hasExpiry: e.target.checked }))}
                    className="h-4 w-4 accent-primary"
                  />
                  Set an expiry date
                </label>
                {form.hasExpiry && (
                  <input
                    type="date"
                    className="input-field mt-2 bg-white"
                    value={form.expires_at}
                    onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                  />
                )}
              </div>

              {/* Optional: usage limit */}
              <div className="rounded-lg border border-border-soft p-3">
                <label className="flex items-center gap-2 text-label-sm text-on-surface">
                  <input
                    type="checkbox"
                    checked={form.hasUsageLimit}
                    onChange={(e) => setForm((f) => ({ ...f, hasUsageLimit: e.target.checked }))}
                    className="h-4 w-4 accent-primary"
                  />
                  Limit total number of uses
                </label>
                {form.hasUsageLimit && (
                  <input
                    type="number"
                    min={1}
                    className="input-field mt-2 bg-white"
                    value={form.usage_limit}
                    onChange={(e) => setForm((f) => ({ ...f, usage_limit: Number(e.target.value) }))}
                  />
                )}
              </div>

              <label className="flex items-center gap-2 text-label-sm text-on-surface">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="h-4 w-4 accent-primary"
                />
                Active (customers can use this code)
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving…' : 'Save coupon'}
              </button>
              <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}