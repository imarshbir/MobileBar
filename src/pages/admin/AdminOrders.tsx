import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Order, OrderStatus } from '@/types';
import { useToast } from '@/components/Toast';
import Loader from '@/components/Loader';

const formatPrice = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const STATUSES: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrders() {
  const { push } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');

  const loadOrders = async () => {
    setLoading(true);
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    const { data } = await query;
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (error) {
      push('Could not update order status.', 'error');
      return;
    }
    setOrders((os) => os.map((o) => (o.id === orderId ? { ...o, status } : o)));
    push('Order status updated.', 'success');
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-headline-lg text-on-surface">Orders</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="input-field w-auto bg-white !py-2 text-label-sm"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-1 text-body-md text-on-surface-variant">Every incoming purchase, with delivery details.</p>

      {loading ? (
        <Loader label="Loading orders" />
      ) : orders.length === 0 ? (
        <p className="mt-6 text-body-md text-on-surface-variant">No orders found.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {orders.map((o) => (
            <div key={o.id} className="card-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-caption uppercase tracking-wide text-on-surface-variant">Order #{o.id.slice(0, 8)}</p>
                  <p className="mt-1 text-label-sm font-semibold text-on-surface">{o.product_name}</p>
                  <p className="text-caption text-on-surface-variant">
                    Qty {o.quantity} · Unit {formatPrice(o.unit_price)} · Total {formatPrice(o.total_price)}
                  </p>
                </div>
                <select
                  value={o.status}
                  onChange={(e) => updateStatus(o.id, e.target.value as OrderStatus)}
                  className="input-field w-auto bg-white !py-1.5 text-caption"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s[0].toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border-soft pt-4 text-body-md sm:grid-cols-3">
                <div>
                  <p className="flex items-center gap-1 text-caption uppercase tracking-wide text-on-surface-variant">
                    <span className="material-symbols-outlined !text-sm">person</span>Customer
                  </p>
                  <p className="mt-0.5 text-on-surface">{o.customer_name}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-caption uppercase tracking-wide text-on-surface-variant">
                    <span className="material-symbols-outlined !text-sm">call</span>Contact
                  </p>
                  <p className="mt-0.5 text-on-surface">{o.customer_mobile}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-caption uppercase tracking-wide text-on-surface-variant">
                    <span className="material-symbols-outlined !text-sm">location_on</span>Delivery address
                  </p>
                  <p className="mt-0.5 text-on-surface">{o.shipping_address}</p>
                </div>
              </div>
              <p className="mt-3 text-caption text-on-surface-variant">Placed {new Date(o.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
