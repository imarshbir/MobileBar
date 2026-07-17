import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Product, Category, Brand } from '@/types';
import { useToast } from '@/components/Toast';
import Loader from '@/components/Loader';

const formatPrice = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// The "-X% OFF" badge is always computed from the admin's two rupee
// inputs (price + discount_amount) — never entered directly, so it can
// never drift out of sync with the actual numbers.
const computeDiscountPercent = (price: number, discountAmount: number) => {
  const compareAt = price + discountAmount;
  if (discountAmount <= 0 || compareAt <= 0) return 0;
  return Math.round((discountAmount / compareAt) * 100);
};

const emptyForm = {
  name: '',
  category_id: '',
  brand_id: '',
  description: '',
  features: '',
  whats_included: '',
  compatible_models: '',
  material: '',
  finish: '',
  color: '',
  price: 0,
  discount_amount: 0,
  stock_quantity: 0,
  video_url: '',
  is_new_arrival: false,
  is_best_seller: false,
  is_featured: false,
  is_active: true,
};

function stockBadge(qty: number) {
  if (qty <= 0) return { label: 'Out of Stock', cls: 'bg-error-container text-on-error-container' };
  if (qty <= 5) return { label: 'Low Stock', cls: 'bg-amber-50 text-amber-700 border border-amber-200' };
  return { label: 'In Stock', cls: 'bg-primary/10 text-primary' };
}

const csv = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

export default function AdminProducts() {
  const { push } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: prods }, { data: cats }, { data: brs }] = await Promise.all([
      supabase.from('products').select('*, category:categories(*), brand:brands(*)').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('display_order'),
      supabase.from('brands').select('*').order('display_order'),
    ]);
    setProducts((prods as Product[]) ?? []);
    setCategories((cats as Category[]) ?? []);
    setBrands((brs as Brand[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, category_id: categories[0]?.id ?? '' });
    setExistingImages([]);
    setImageFiles([]);
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      category_id: p.category_id,
      brand_id: p.brand_id ?? '',
      description: p.description,
      features: p.features.join(', '),
      whats_included: p.whats_included.join(', '),
      compatible_models: p.compatible_models.join(', '),
      material: p.material,
      finish: p.finish,
      color: p.color,
      price: p.price,
      discount_amount: p.discount_amount,
      stock_quantity: p.stock_quantity,
      video_url: p.video_url,
      is_new_arrival: p.is_new_arrival,
      is_best_seller: p.is_best_seller,
      is_featured: p.is_featured,
      is_active: p.is_active,
    });
    setExistingImages(p.image_urls ?? []);
    setImageFiles([]);
    setModalOpen(true);
  };

  const uploadImages = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of imageFiles) {
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/\s+/g, '-')}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file, { cacheControl: '3600' });
      if (error) {
        push(`Image upload failed: ${error.message}`, 'error');
        continue;
      }
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.category_id) {
      push('Product name and category are required.', 'error');
      return;
    }
    if (form.price <= 0) {
      push('Enter a selling price greater than 0.', 'error');
      return;
    }
    if (form.discount_amount < 0) {
      push('Discount amount cannot be negative.', 'error');
      return;
    }
    setSaving(true);
    const newUrls = await uploadImages();
    const payload = {
      name: form.name.trim(),
      category_id: form.category_id,
      brand_id: form.brand_id || null,
      description: form.description,
      features: csv(form.features),
      whats_included: csv(form.whats_included),
      compatible_models: csv(form.compatible_models),
      material: form.material,
      finish: form.finish,
      color: form.color,
      price: form.price,
      discount_amount: form.discount_amount,
      stock_quantity: form.stock_quantity,
      video_url: form.video_url,
      is_new_arrival: form.is_new_arrival,
      is_best_seller: form.is_best_seller,
      is_featured: form.is_featured,
      is_active: form.is_active,
      image_urls: [...existingImages, ...newUrls],
    };

    const { error } = editingId
      ? await supabase.from('products').update(payload).eq('id', editingId)
      : await supabase.from('products').insert(payload);

    setSaving(false);
    if (error) {
      push(`Could not save product: ${error.message}`, 'error');
      return;
    }
    push(editingId ? 'Product updated.' : 'Product listed.', 'success');
    setModalOpen(false);
    loadAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this listing permanently?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      push('Could not delete — it may have existing orders. Try deactivating instead.', 'error');
      return;
    }
    push('Product deleted.', 'success');
    loadAll();
  };

  const toggleActive = async (p: Product) => {
    await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id);
    loadAll();
  };

  const previewPercent = computeDiscountPercent(form.price, form.discount_amount);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-headline-lg text-on-surface">Inventory Management</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entries…"
              className="input-field w-56 bg-white pl-10"
            />
          </div>
          <button onClick={openCreate} className="btn-primary">
            <span className="material-symbols-outlined !text-base">add</span>
            New Listing
          </button>
        </div>
      </div>

      {loading ? (
        <Loader label="Loading inventory" />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border-soft bg-white shadow-1">
          <table className="w-full text-left text-body-md">
            <thead className="bg-surface-container-low text-caption uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft">
              {filtered.map((p) => {
                const badge = stockBadge(p.stock_quantity);
                const pct = computeDiscountPercent(p.price, p.discount_amount);
                return (
                  <tr key={p.id} className="text-on-surface">
                    <td className="flex items-center gap-3 px-4 py-3">
                      <div className="h-10 w-10 overflow-hidden rounded-md bg-surface-container-low">
                        {p.image_urls?.[0] && <img src={p.image_urls[0]} className="h-full w-full object-cover" alt="" />}
                      </div>
                      <span className="text-label-sm font-medium">{p.name}</span>
                    </td>
                    <td className="px-4 py-3 text-caption text-on-surface-variant">{p.category?.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">{formatPrice(p.price)}</span>
                        {p.discount_amount > 0 && (
                          <>
                            <span className="text-caption text-outline line-through">{formatPrice(p.compare_at_price)}</span>
                            <span className="rounded-full bg-error/10 px-1.5 py-0.5 text-[10px] font-semibold text-error">-{pct}%</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{p.stock_quantity}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          // Hiding is the risky direction (removes it from
                          // the storefront) — confirm before flipping that
                          // way. Re-showing needs no confirmation.
                          if (p.is_active && !confirm(`Hide "${p.name}" from the storefront?`)) return;
                          toggleActive(p);
                        }}
                        title={p.is_active ? 'Click to hide this product from customers' : 'Click to make this product visible again'}
                        className={`rounded-full px-3 py-1 text-caption font-semibold ring-1 ring-inset ring-transparent transition hover:ring-current ${
                          p.is_active ? badge.cls : 'bg-surface-container-low text-on-surface-variant'
                        }`}
                      >
                        {p.is_active ? badge.label : 'Hidden'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(p)} className="mr-2 text-on-surface-variant hover:text-primary" title="Edit">
                        <span className="material-symbols-outlined !text-lg">edit</span>
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="text-on-surface-variant hover:text-error" title="Delete">
                        <span className="material-symbols-outlined !text-lg">delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="p-6 text-center text-body-md text-on-surface-variant">No products found.</p>}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-secondary/50 p-4" onClick={() => setModalOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-headline-md !text-lg text-on-surface">{editingId ? 'Edit product' : 'Add product'}</h2>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-caption text-on-surface-variant">Product Name</label>
                <input className="input-field bg-white" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-caption text-on-surface-variant">Category</label>
                <select className="input-field bg-white" value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}>
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-caption text-on-surface-variant">Brand (optional)</label>
                <select className="input-field bg-white" value={form.brand_id} onChange={(e) => setForm((f) => ({ ...f, brand_id: e.target.value }))}>
                  <option value="">None</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-caption text-on-surface-variant">Material</label>
                <input className="input-field bg-white" value={form.material} onChange={(e) => setForm((f) => ({ ...f, material: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-caption text-on-surface-variant">Finish</label>
                <input className="input-field bg-white" value={form.finish} onChange={(e) => setForm((f) => ({ ...f, finish: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-caption text-on-surface-variant">Color</label>
                <input className="input-field bg-white" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-caption text-on-surface-variant">Stock quantity</label>
                <input
                  type="number"
                  className="input-field bg-white"
                  value={form.stock_quantity}
                  onChange={(e) => setForm((f) => ({ ...f, stock_quantity: Number(e.target.value) }))}
                />
              </div>
            </div>

            {/* Pricing — the actual selling price plus an optional flat
                discount amount. The "% off" badge below is computed
                live from these two numbers, never entered separately. */}
            <div className="mt-4 rounded-lg border border-border-soft bg-surface-container-low p-4">
              <p className="mb-3 flex items-center gap-1.5 text-label-sm font-semibold text-on-surface">
                <span className="material-symbols-outlined !text-base text-primary">payments</span>
                Pricing
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-caption text-on-surface-variant">Selling Price (₹)</label>
                  <input
                    type="number"
                    min={0}
                    className="input-field bg-white"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                  />
                  <p className="mt-1 text-caption text-on-surface-variant">The exact amount you receive per sale.</p>
                </div>
                <div>
                  <label className="mb-1 block text-caption text-on-surface-variant">Discount Amount (₹, optional)</label>
                  <input
                    type="number"
                    min={0}
                    className="input-field bg-white"
                    value={form.discount_amount}
                    onChange={(e) => setForm((f) => ({ ...f, discount_amount: Number(e.target.value) }))}
                    placeholder="0"
                  />
                  <p className="mt-1 text-caption text-on-surface-variant">Added on top to show a crossed-out price.</p>
                </div>
              </div>

              {form.discount_amount > 0 && form.price > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-white p-3">
                  <span className="text-caption text-on-surface-variant">Customers will see:</span>
                  <span className="text-label-sm text-outline line-through">{formatPrice(form.price + form.discount_amount)}</span>
                  <span className="text-label-sm font-bold text-on-surface">{formatPrice(form.price)}</span>
                  <span className="rounded-full bg-error/10 px-2 py-0.5 text-caption font-semibold text-error">-{previewPercent}% OFF</span>
                </div>
              )}
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-caption text-on-surface-variant">Compatible Models (comma-separated)</label>
              <input
                className="input-field bg-white"
                value={form.compatible_models}
                onChange={(e) => setForm((f) => ({ ...f, compatible_models: e.target.value }))}
                placeholder="iPhone 15, iPhone 15 Pro"
              />
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-caption text-on-surface-variant">Description</label>
              <textarea
                className="input-field resize-none bg-white"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-caption text-on-surface-variant">Features (comma-separated)</label>
              <input className="input-field bg-white" value={form.features} onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))} />
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-caption text-on-surface-variant">What's Included (comma-separated)</label>
              <input className="input-field bg-white" value={form.whats_included} onChange={(e) => setForm((f) => ({ ...f, whats_included: e.target.value }))} />
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-caption text-on-surface-variant">Product Video URL (optional)</label>
              <input className="input-field bg-white" value={form.video_url} onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))} placeholder="https://…mp4" />
            </div>

            <div className="mt-4 flex flex-wrap gap-4">
              {(
                [
                  ['is_new_arrival', 'New Arrival'],
                  ['is_best_seller', 'Best Seller'],
                  ['is_featured', 'Featured'],
                  ['is_active', 'Active (visible to customers)'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-label-sm text-on-surface">
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                    className="h-4 w-4 accent-primary"
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-caption text-on-surface-variant">Images</label>
              {existingImages.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {existingImages.map((url, i) => (
                    <div key={url} className="relative h-14 w-14 overflow-hidden rounded-md">
                      <img src={url} className="h-full w-full object-cover" alt="" />
                      <button
                        onClick={() => setExistingImages((imgs) => imgs.filter((_, idx) => idx !== i))}
                        className="absolute right-0 top-0 bg-secondary/80 px-1 text-[10px] text-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setImageFiles(Array.from(e.target.files ?? []))}
                className="w-full text-caption text-on-surface-variant file:mr-3 file:rounded-lg file:border-0 file:bg-surface-container-low file:px-3 file:py-1.5 file:text-caption file:text-on-surface"
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving…' : 'Save listing'}
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