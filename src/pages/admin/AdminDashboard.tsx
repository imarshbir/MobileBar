import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Bestseller } from '@/types';
import Loader from '@/components/Loader';

const formatPrice = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

interface Stats {
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  revenue: number;
}

const STAT_ICONS: Record<string, string> = {
  'Live listings': 'inventory_2',
  'Total orders': 'receipt_long',
  'Pending orders': 'pending_actions',
  Revenue: 'payments',
};

export default function AdminDashboard() {
  const [bestsellers, setBestsellers] = useState<Bestseller[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const [{ data: best }, { count: totalProducts }, { data: orders }] = await Promise.all([
        supabase.from('bestsellers').select('*').limit(8),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('total_price,status'),
      ]);

      setBestsellers((best as Bestseller[]) ?? []);

      const orderRows = orders ?? [];
      setStats({
        totalProducts: totalProducts ?? 0,
        totalOrders: orderRows.length,
        pendingOrders: orderRows.filter((o) => o.status === 'confirmed').length,
        revenue: orderRows.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_price), 0),
      });

      setLoading(false);
    })();
  }, []);

  if (loading) return <Loader label="Loading dashboard" />;

  const statCards = [
    { label: 'Live listings', value: stats?.totalProducts ?? 0 },
    { label: 'Total orders', value: stats?.totalOrders ?? 0 },
    { label: 'Pending orders', value: stats?.pendingOrders ?? 0 },
    { label: 'Revenue', value: formatPrice(stats?.revenue ?? 0) },
  ];

  return (
    <div>
      <h1 className="text-headline-lg text-on-surface">Dashboard</h1>
      <p className="mt-1 text-body-md text-on-surface-variant">Store performance at a glance.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="card-surface p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <span className="material-symbols-outlined !text-lg">{STAT_ICONS[s.label]}</span>
              </span>
            </div>
            <p className="mt-3 text-caption uppercase tracking-wide text-on-surface-variant">{s.label}</p>
            <p className="mt-1 text-headline-lg !text-2xl text-on-surface">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-xl">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">local_fire_department</span>
          <h2 className="text-headline-md !text-lg text-on-surface">Recently sold the most</h2>
        </div>
        <p className="text-caption text-on-surface-variant">Ranked by units sold in the last 30 days.</p>

        {bestsellers.length === 0 ? (
          <p className="mt-4 text-body-md text-on-surface-variant">No sales recorded yet.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-border-soft bg-white shadow-1">
            <table className="w-full text-left text-body-md">
              <thead className="bg-surface-container-low text-caption uppercase tracking-wide text-on-surface-variant">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Sold (30d)</th>
                  <th className="px-4 py-3">Sold (all time)</th>
                  <th className="px-4 py-3">Revenue</th>
                  <th className="px-4 py-3">Stock left</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {bestsellers.map((b, i) => (
                  <tr key={b.product_id} className="text-on-surface">
                    <td className="flex items-center gap-3 px-4 py-3">
                      <span className="text-caption text-on-surface-variant">#{i + 1}</span>
                      <div className="h-9 w-9 overflow-hidden rounded-md bg-surface-container-low">
                        {b.image_urls?.[0] && <img src={b.image_urls[0]} className="h-full w-full object-cover" alt="" />}
                      </div>
                      <span className="text-label-sm">{b.name}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary">{b.units_sold_30d}</td>
                    <td className="px-4 py-3">{b.units_sold_all_time}</td>
                    <td className="px-4 py-3">{formatPrice(b.revenue_all_time)}</td>
                    <td className="px-4 py-3">
                      <span className={b.stock_quantity <= 3 ? 'font-semibold text-error' : 'text-on-surface-variant'}>
                        {b.stock_quantity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
