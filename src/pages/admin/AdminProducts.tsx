import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Product } from '@/types';
import { useToast } from '@/components/Toast';
import Loader from '@/components/Loader';

const formatPrice = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const emptyForm = {
  brand: '',
  model_name: '',
  description: '',
  ram_gb: 8,
  storage_gb: 128,
  color: '',
  processor: '',
  price: 0,
  stock_quantity: 0,
  is_active: true,
};

function stockBadge(qty: number) {
  if (qty <= 0) return { label: 'Out of Stock', cls: 'bg-error-container text-on-error-container' };
  if (qty <= 5) return { label: 'Low Stock', cls: 'bg-amber-50 text-amber-700 border border-amber-200' };
  return { label: 'In Stock', cls: 'bg-primary/10 text-primary' };
}

export default function AdminProducts() {
  const { push } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    setProducts((data as Product[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filtered = products.filter((p) =>
    `${p.brand} ${p.model_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setExistingImages([]);
    setImageFiles([]);
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      brand: p.brand,
      model_name: p.model_name,
      description: p.description,
      ram_gb: p.ram_gb,
      storage_gb: p.storage_gb,
      color: p.color,
      processor: p.processor,
      price: p.price,
      stock_quantity: p.stock_quantity,
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
    if (!form.brand.trim() || !form.model_name.trim()) {
      push('Brand and model name are required.', 'error');
      return;
    }
    setSaving(true);
    const newUrls = await uploadImages();
    const image_urls = [...existingImages, ...newUrls];
    const payload = { ...form, image_urls };

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
    loadProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this listing permanently?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      push('Could not delete — it may have existing orders. Try deactivating instead.', 'error');
      return;
    }
    push('Product deleted.', 'success');
    loadProducts();
  };

  const toggleActive = async (p: Product) => {
    await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id);
    loadProducts();
  };

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
        <div className="mt-6 overflow-hidden rounded-lg border border-border-soft bg-white shadow-1">
          <table className="w-full text-left text-body-md">
            <thead className="bg-surface-container-low text-caption uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Specs</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft">
              {filtered.map((p) => {
                const badge = stockBadge(p.stock_quantity);
                return (
                  <tr key={p.id} className="text-on-surface">
                    <td className="flex items-center gap-3 px-4 py-3">
                      <div className="h-10 w-10 overflow-hidden rounded-md bg-surface-container-low">
                        {p.image_urls?.[0] && <img src={p.image_urls[0]} className="h-full w-full object-cover" alt="" />}
                      </div>
                      <span className="text-label-sm font-medium">
                        {p.brand} {p.model_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-caption text-on-surface-variant">
                      {p.ram_gb}GB / {p.storage_gb}GB
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatPrice(p.price)}</td>
                    <td className="px-4 py-3">{p.stock_quantity}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(p)}
                        className={`rounded-full px-3 py-1 text-caption font-semibold ${
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
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-headline-md !text-lg text-on-surface">{editingId ? 'Edit product' : 'Add product'}</h2>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-caption text-on-surface-variant">Brand</label>
                <input className="input-field bg-white" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-caption text-on-surface-variant">Model name</label>
                <input className="input-field bg-white" value={form.model_name} onChange={(e) => setForm((f) => ({ ...f, model_name: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-caption text-on-surface-variant">RAM (GB)</label>
                <input type="number" className="input-field bg-white" value={form.ram_gb} onChange={(e) => setForm((f) => ({ ...f, ram_gb: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="mb-1 block text-caption text-on-surface-variant">Storage (GB)</label>
                <input type="number" className="input-field bg-white" value={form.storage_gb} onChange={(e) => setForm((f) => ({ ...f, storage_gb: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="mb-1 block text-caption text-on-surface-variant">Color</label>
                <input className="input-field bg-white" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-caption text-on-surface-variant">Processor</label>
                <input className="input-field bg-white" value={form.processor} onChange={(e) => setForm((f) => ({ ...f, processor: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-caption text-on-surface-variant">Price (₹)</label>
                <input type="number" className="input-field bg-white" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} />
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

            <div className="mt-3">
              <label className="mb-1 block text-caption text-on-surface-variant">Description</label>
              <textarea
                className="input-field resize-none bg-white"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
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
