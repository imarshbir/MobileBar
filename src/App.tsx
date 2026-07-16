import { Routes, Route } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Home from '@/pages/Home';
import Shop from '@/pages/Shop';
import Auth from '@/pages/Auth';
import ProductDetail from '@/pages/ProductDetail';
import Cart from '@/pages/Cart';
import Checkout from '@/pages/Checkout';
import Profile from '@/pages/Profile';
import Wishlist from '@/pages/Wishlist';
import AboutUs from '@/pages/AboutUs';
import ContactUs from '@/pages/ContactUs';
import Policies from '@/pages/Policies';
import NotFound from '@/pages/NotFound';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';
import AdminLogin from '@/pages/admin/AdminLogin';
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminProducts from '@/pages/admin/AdminProducts';
import AdminOrders from '@/pages/admin/AdminOrders';
import AdminCoupons from '@/pages/admin/AdminCoupons';

function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public storefront */}
      <Route path="/" element={<StorefrontLayout><Home /></StorefrontLayout>} />
      <Route path="/shop/:categorySlug" element={<StorefrontLayout><Shop /></StorefrontLayout>} />
      <Route path="/shop" element={<StorefrontLayout><Shop /></StorefrontLayout>} />
      <Route path="/product/:id" element={<StorefrontLayout><ProductDetail /></StorefrontLayout>} />
      <Route path="/about" element={<StorefrontLayout><AboutUs /></StorefrontLayout>} />
      <Route path="/contact" element={<StorefrontLayout><ContactUs /></StorefrontLayout>} />
      <Route path="/policies" element={<StorefrontLayout><Policies /></StorefrontLayout>} />
      <Route path="/login" element={<Auth initialTab="login" />} />
      <Route path="/register" element={<Auth initialTab="register" />} />
      <Route path="/cart" element={<StorefrontLayout><Cart /></StorefrontLayout>} />

      {/* Customer-only */}
      <Route
        path="/wishlist"
        element={
          <StorefrontLayout>
            <ProtectedRoute>
              <Wishlist />
            </ProtectedRoute>
          </StorefrontLayout>
        }
      />
      <Route
        path="/checkout"
        element={
          <StorefrontLayout>
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          </StorefrontLayout>
        }
      />
      <Route
        path="/profile"
        element={
          <StorefrontLayout>
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          </StorefrontLayout>
        }
      />

      {/* Hidden admin console — reachable only via /admin, never linked in the UI */}
      <Route path="/admin">
        <Route index element={<AdminLogin />} />
        <Route
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="coupons" element={<AdminCoupons />} />
        </Route>
      </Route>

      <Route path="*" element={<StorefrontLayout><NotFound /></StorefrontLayout>} />
    </Routes>
  );
}