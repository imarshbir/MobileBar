import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Product, ProductReview } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useToast } from '@/components/Toast';
import ProductCard from '@/components/ProductCard';
import Loader from '@/components/Loader';

const formatPrice = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// Same computation as ProductCard.tsx and AdminProducts.tsx — the
// percent badge is always derived from price + discount_amount, never
// stored as its own number, so it can never go out of sync.
const computeDiscountPercent = (product: Product) => {
  if (product.discount_amount <= 0 || product.compare_at_price <= 0) return 0;
  return Math.round((product.discount_amount / product.compare_at_price) * 100);
};

type Tab = 'description' | 'delivery' | 'returns';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { push } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [activeMedia, setActiveMedia] = useState(0);
  const [tab, setTab] = useState<Tab>('description');
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
      setActiveMedia(0);
      setTab('description');
      const { data } = await supabase.from('products').select('*, category:categories(*), brand:brands(*)').eq('id', id).single();
      const p = (data as Product) ?? null;
      setProduct(p);
      await loadReviews();

      if (p) {
        const { data: rel } = await supabase
          .from('products')
          .select('*, category:categories(*), brand:brands(*)')
          .eq('category_id', p.category_id)
          .eq('is_active', true)
          .neq('id', p.id)
          .limit(5);
        setRelated((rel as Product[]) ?? []);
      }
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
  const discountPercent = computeDiscountPercent(product);
  const hasDiscount = discountPercent > 0;
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const media = [...product.image_urls, ...(product.video_url ? [product.video_url] : [])];
  const isVideoActive = product.video_url && activeMedia === media.length - 1;

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

  const handleWishlist = async () => {
    if (!session) return navigate('/login', { state: { from: `/product/${product.id}` } });
    await toggleWishlist(product.id);
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
            {isVideoActive ? (
              <video src={product.video_url} controls className="h-full w-full object-cover" />
            ) : media[activeMedia] ? (
              <img src={media[activeMedia]} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-outline">
                <span className="material-symbols-outlined !text-5xl">category</span>
              </div>
            )}
          </div>
          {media.length > 1 && (
            <div className="mt-3 flex gap-2">
              {media.map((m, i) => (
                <button
                  key={m + i}
                  onClick={() => setActiveMedia(i)}
                  className={`relative h-16 w-16 overflow-hidden rounded-md border-2 ${
                    activeMedia === i ? 'border-primary' : 'border-border-soft'
                  }`}
                >
                  {product.video_url && i === media.length - 1 ? (
                    <div className="flex h-full w-full items-center justify-center bg-secondary">
                      <span className="material-symbols-outlined text-white">play_circle</span>
                    </div>
                  ) : (
                    <img src={m} alt="" className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex items-start justify-between">
            <div>
              {product.brand && <p className="eyebrow">{product.brand.name}</p>}
              <h1 className="mt-1 text-headline-lg text-on-surface">{product.name}</h1>
            </div>
            <button onClick={handleWishlist} className="flex h-10 w-10 items-center justify-center rounded-full border border-border-soft bg-white">
              <span
                className={`material-symbols-outlined ${isWishlisted(product.id) ? 'text-error' : 'text-on-surface-variant'}`}
                style={{ fontVariationSettings: `'FILL' ${isWishlisted(product.id) ? 1 : 0}` }}
              >
                favorite
              </span>
            </button>
          </div>

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

          <div className="mt-md flex items-baseline gap-3">
            <p className="text-display-lg !text-[32px] text-primary-deep">{formatPrice(product.price)}</p>
            {hasDiscount && (
              <>
                <p className="text-headline-md !text-lg text-outline line-through">{formatPrice(product.compare_at_price)}</p>
                <span className="rounded-full bg-error/10 px-2.5 py-1 text-caption font-semibold text-error">
                  -{discountPercent}% OFF
                </span>
              </>
            )}
          </div>

          {product.compatible_models?.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-caption font-semibold uppercase tracking-wide text-on-surface-variant">Available Models</p>
              <div className="flex flex-wrap gap-1.5">
                {product.compatible_models.map((m) => (
                  <span key={m} className="spec-chip">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {product.material && <span className="spec-chip">Material: {product.material}</span>}
            {product.finish && <span className="spec-chip">Finish: {product.finish}</span>}
            {product.color && <span className="spec-chip">Color: {product.color}</span>}
          </div>

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
              Add to Cart
            </button>
            <button onClick={handleBuyNow} disabled={outOfStock} className="btn-primary flex-1 shadow-3">
              Buy Now
            </button>
          </div>

          {product.features?.length > 0 && (
            <div className="mt-6 rounded-lg border border-border-soft bg-surface-container-low p-4">
              <p className="mb-2 text-label-sm font-semibold text-on-surface">Features</p>
              <ul className="space-y-1.5">
                {product.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-body-md text-on-surface-variant">
                    <span className="material-symbols-outlined !text-base text-primary">check</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.whats_included?.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-label-sm font-semibold text-on-surface">What's Included</p>
              <p className="text-body-md text-on-surface-variant">{product.whats_included.join(' · ')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Description / Delivery / Returns tabs */}
      <section className="mt-xl max-w-3xl">
        <div className="flex border-b border-border-soft">
          {(
            [
              ['description', 'Description'],
              ['delivery', 'Delivery Information'],
              ['returns', 'Return Policy'],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`border-b-2 px-4 py-3 text-label-sm transition ${
                tab === key ? 'border-primary font-semibold text-primary-deep' : 'border-transparent text-on-surface-variant'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="py-5 text-body-md leading-relaxed text-on-surface-variant">
          {tab === 'description' && (product.description || 'No description provided.')}
          {tab === 'delivery' && product.delivery_info}
          {tab === 'returns' && product.return_policy}
        </div>
      </section>

      {/* Reviews */}
      <section className="mt-xl max-w-2xl">
        <h2 className="text-headline-lg !text-2xl text-on-surface">Customer Reviews</h2>

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
            placeholder="How's the product treating you?"
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

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-xl">
          <h2 className="mb-md text-headline-lg !text-2xl text-on-surface">You may also like</h2>
          <div className="grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-5">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <Link to={`/shop`} className="mt-lg inline-flex items-center gap-1 text-label-sm text-primary hover:underline">
        <span className="material-symbols-outlined !text-base">arrow_back</span>
        Back to shop
      </Link>
    </div>
  );
}