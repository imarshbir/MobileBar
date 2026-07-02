import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Product, ProductReview } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/components/Toast';
import Loader from '@/components/Loader';

const formatPrice = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { addToCart } = useCart();
  const { push } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadReviews = async () => {
    const { data } = await supabase
      .from('product_reviews')
      .select('*, profiles(full_name)')
      .eq('product_id', id)
      .order('created_at', { ascending: false });
    setReviews((data as unknown as ProductReview[]) ?? []);
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('products').select('*').eq('id', id).single();
      setProduct((data as Product) ?? null);
      await loadReviews();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <Loader label="Loading product" />;
  if (!product) {
    return (
      <div className="container-page py-24 text-center">
        <p className="text-headline-md text-on-surface">This listing isn't available anymore.</p>
        <button onClick={() => navigate('/')} className="btn-secondary mt-4">
          Back to shop
        </button>
      </div>
    );
  }

  const outOfStock = product.stock_quantity <= 0;
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const handleAddToCart = async () => {
    if (!session) return navigate('/login', { state: { from: `/product/${product.id}` } });
    const { error } = await addToCart(product.id, qty);
    push(error ? 'Could not add to cart.' : 'Added to cart.', error ? 'error' : 'success');
  };

  const handleBuyNow = async () => {
    if (!session) return navigate('/login', { state: { from: `/product/${product.id}` } });
    await addToCart(product.id, qty);
    navigate('/cart');
  };

  const submitReview = async () => {
    if (!session) return navigate('/login', { state: { from: `/product/${product.id}` } });
    if (!reviewText.trim()) return;
    setSubmittingReview(true);
    const { error } = await supabase.from('product_reviews').upsert(
      { product_id: product.id, customer_id: session.user.id, rating: reviewRating, comment: reviewText.trim() },
      { onConflict: 'product_id,customer_id' }
    );
    setSubmittingReview(false);
    if (error) {
      push('Could not submit review.', 'error');
      return;
    }
    setReviewText('');
    push('Review posted. Thanks!', 'success');
    loadReviews();
  };

  return (
    <div className="container-page py-xl">
      <div className="grid gap-xl lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="card-surface aspect-square overflow-hidden bg-surface-container-low">
            {product.image_urls?.length ? (
              <img src={product.image_urls[activeImage]} alt={product.model_name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-outline">
                <span className="material-symbols-outlined !text-5xl">smartphone</span>
              </div>
            )}
          </div>
          {product.image_urls?.length > 1 && (
            <div className="mt-3 flex gap-2">
              {product.image_urls.map((url, i) => (
                <button
                  key={url + i}
                  onClick={() => setActiveImage(i)}
                  className={`h-16 w-16 overflow-hidden rounded-md border-2 ${
                    activeImage === i ? 'border-primary' : 'border-border-soft'
                  }`}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="eyebrow">{product.brand}</p>
          <h1 className="mt-1 text-headline-lg text-on-surface">{product.model_name}</h1>

          {reviews.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-label-sm text-on-surface-variant">
              <span className="flex items-center text-primary">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="material-symbols-outlined !text-base" style={{ fontVariationSettings: `'FILL' ${i < Math.round(avgRating) ? 1 : 0}` }}>
                    star
                  </span>
                ))}
              </span>
              <span>
                {avgRating.toFixed(1)} · {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          <p className="mt-md text-display-lg !text-[32px] text-primary-deep">{formatPrice(product.price)}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="spec-chip">RAM: {product.ram_gb}GB</span>
            <span className="spec-chip">Storage: {product.storage_gb}GB</span>
            {product.color && <span className="spec-chip">Color: {product.color}</span>}
            {product.processor && <span className="spec-chip">Chipset: {product.processor}</span>}
          </div>

          {product.description && <p className="mt-5 text-body-md leading-relaxed text-on-surface-variant">{product.description}</p>}

          <p className={`mt-5 flex items-center gap-1.5 text-label-sm font-semibold ${outOfStock ? 'text-error' : 'text-primary'}`}>
            <span className="material-symbols-outlined !text-base">{outOfStock ? 'cancel' : 'check_circle'}</span>
            {outOfStock ? 'Out of stock' : `${product.stock_quantity} units in stock`}
          </p>

          {!outOfStock && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex items-center rounded-lg border border-border-soft bg-white">
                <button onClick={() => setQty((n) => Math.max(1, n - 1))} className="px-3 py-2 text-on-surface-variant hover:text-primary">
                  −
                </button>
                <span className="w-8 text-center text-label-sm">{qty}</span>
                <button
                  onClick={() => setQty((n) => Math.min(product.stock_quantity, n + 1))}
                  className="px-3 py-2 text-on-surface-variant hover:text-primary"
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button onClick={handleAddToCart} disabled={outOfStock} className="btn-secondary flex-1">
              <span className="material-symbols-outlined !text-base">add_shopping_cart</span>
              Add to cart
            </button>
            <button onClick={handleBuyNow} disabled={outOfStock} className="btn-primary flex-1 shadow-3">
              <span className="material-symbols-outlined !text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                lock
              </span>
              Buy now
            </button>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-xl max-w-2xl">
        <h2 className="text-headline-lg !text-2xl text-on-surface">Customer feedback</h2>

        <div className="mt-5 card-surface p-5">
          <p className="mb-2 text-label-sm text-on-surface-variant">Leave a review</p>
          <div className="mb-3 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setReviewRating(n)} className={n <= reviewRating ? 'text-primary' : 'text-outline-variant'}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${n <= reviewRating ? 1 : 0}` }}>
                  star
                </span>
              </button>
            ))}
          </div>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            className="input-field resize-none bg-white"
            rows={3}
            placeholder="How's the phone treating you?"
          />
          <button onClick={submitReview} disabled={submittingReview} className="btn-primary mt-3">
            {submittingReview ? 'Posting…' : 'Post review'}
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {reviews.length === 0 && <p className="text-body-md text-on-surface-variant">No reviews yet — be the first.</p>}
          {reviews.map((r) => (
            <div key={r.id} className="border-b border-border-soft pb-4">
              <div className="flex items-center justify-between">
                <span className="text-label-sm font-semibold text-on-surface">{r.profiles?.full_name ?? 'Verified buyer'}</span>
                <span className="flex text-primary">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="material-symbols-outlined !text-sm" style={{ fontVariationSettings: `'FILL' ${i < r.rating ? 1 : 0}` }}>
                      star
                    </span>
                  ))}
                </span>
              </div>
              <p className="mt-1 text-body-md text-on-surface-variant">{r.comment}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
