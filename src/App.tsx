import { Routes, Route } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Home from '@/pages/Home';
import Auth from '@/pages/Auth';
import ProductDetail from '@/pages/ProductDetail';
import Cart from '@/pages/Cart';
import Checkout from '@/pages/Checkout';
import Profile from '@/pages/Profile';
import NotFound from '@/pages/NotFound';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';
import AdminLogin from '@/pages/admin/AdminLogin';
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminProducts from '@/pages/admin/AdminProducts';
import AdminOrders from '@/pages/admin/AdminOrders';

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
      <Route path="/product/:id" element={<StorefrontLayout><ProductDetail /></StorefrontLayout>} />
      <Route path="/login" element={<Auth initialTab="login" />} />
      <Route path="/register" element={<Auth initialTab="register" />} />
      <Route path="/cart" element={<StorefrontLayout><Cart /></StorefrontLayout>} />

      {/* Customer-only */}
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
        </Route>
      </Route>

      <Route path="*" element={<StorefrontLayout><NotFound /></StorefrontLayout>} />
    </Routes>
  );
}
