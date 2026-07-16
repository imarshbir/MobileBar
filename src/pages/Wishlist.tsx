import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/contexts/WishlistContext';
import ProductCard from '@/components/ProductCard';
import Loader from '@/components/Loader';

export default function Wishlist() {
  const { session } = useAuth();
  const { items, loading } = useWishlist();
  const navigate = useNavigate();

  if (!session) {
    return (
      <div className="container-page py-24 text-center">
        <p className="text-headline-md text-on-surface">Sign in to see your wishlist.</p>
        <button onClick={() => navigate('/login', { state: { from: '/wishlist' } })} className="btn-primary mt-4">
          Login / Register
        </button>
      </div>
    );
  }

  if (loading) return <Loader label="Loading wishlist" />;

  if (items.length === 0) {
    return (
      <div className="container-page py-24 text-center">
        <span className="material-symbols-outlined !text-4xl text-outline">favorite</span>
        <p className="mt-2 text-headline-md text-on-surface">Your wishlist is empty.</p>
        <Link to="/" className="btn-primary mt-4 inline-flex">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-xl">
      <h1 className="text-headline-lg text-on-surface">Your Wishlist</h1>
      <div className="mt-6 grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => item.product && <ProductCard key={item.id} product={item.product} />)}
      </div>
    </div>
  );
}
