# Mobile Bar

A production-structured mobile phone e-commerce platform. React + TypeScript + Tailwind on the
frontend, Supabase (Postgres + Auth + Storage + Row Level Security) on the backend.

## 1. Prerequisites

- Node.js 18+ and npm
- A free [Supabase](https://supabase.com) project

## 2. Set up Supabase

1. Create a new Supabase project.
2. Open **SQL Editor** and run the entire contents of `supabase/schema.sql` once. This creates:
   - `products`, `profiles`, `orders`, `cart_items`, `product_reviews` tables
   - A `place_order()` function that atomically checks stock and creates orders (so a customer
     can never oversell stock or forge a price by tampering with client-side requests)
   - A `bestsellers` view for the admin "recently sold the most" panel
   - Row Level Security policies on every table
   - A public storage bucket `product-images` for listing photos
3. **Create the admin account** (Authentication → Users → Add user):
   - Email: `admin@mobilebar.com`
   - Password: `Admin*123` (change this after your first login — see Security notes below)
   - Tick "Auto Confirm User"
4. Back in SQL Editor, run:
   ```sql
   update public.profiles set is_admin = true where email = 'admin@mobilebar.com';
   ```
5. Go to **Project Settings → API** and copy your Project URL and `anon public` key.

## 3. Configure the app

```bash
cp .env.example .env
```

Paste your Supabase URL and anon key into `.env`:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Never put the `service_role` key here — it isn't needed anywhere in this app.

## 4. Install and run

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`.

## 5. Using the app

**Customers:** browse the homepage freely; login/register is only required at checkout
(enforced both in the UI and by Postgres RLS). Register with email, mobile number, name,
address, and password. Login accepts either an email or a mobile number.

**Admin:** the console is not linked anywhere in the storefront UI. Go directly to
`/admin` in the browser, sign in with the admin account created above, and you'll land on
a dashboard with:
- **Dashboard** — live stats + "Recently sold the most" (30-day and all-time bestsellers)
- **Products** — add/edit/delete listings, upload images, adjust price and stock, hide a
  listing without deleting it
- **Orders** — every order with customer name, mobile number, delivery address, product,
  and quantity, plus a status dropdown (pending → confirmed → shipped → delivered)

## 6. Deploying to production

This is a static Vite/React app with no server component of its own — Supabase is the only
backend, hosted separately. That means **Vercel (or Netlify/Cloudflare Pages) is the right
choice**, not Render: those serve your build as static files off a CDN, so there's no server
process to "sleep" after inactivity — that cold-start delay is specific to Render's free-tier
web *services*, which don't apply here since there's nothing server-side to spin down.

### Deploy to Vercel

1. Push this project to a GitHub repo.
2. [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Framework preset: **Vite** (auto-detected).
4. Add environment variables (Project Settings → Environment Variables):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy.

The included `vercel.json` handles client-side routing — without it, refreshing a URL like
`/admin/dashboard` or `/product/some-id` directly would 404, because Vercel doesn't know
those paths exist server-side (React Router handles them client-side only). The rewrite
rule sends every request to `index.html` and lets React Router take over from there.

### After deploying

- Update Supabase → **Authentication → URL Configuration** → add your Vercel domain
  (e.g. `https://mobile-bar.vercel.app`) to both **Site URL** and **Redirect URLs**, or
  email confirmation links will redirect to `localhost` instead of your live site.
- Set up custom SMTP (see Security notes) before real users start registering — Supabase's
  shared test email service is rate-limited to a few emails/hour and isn't meant for
  production traffic.



## 7. Architecture

```
src/
  components/     Header, ProductCard, route guards, Toast, Loader
  contexts/       AuthContext (session/profile/login/register), CartContext
  pages/          storefront pages
  pages/admin/    admin console (login, layout, dashboard, products, orders)
  lib/            supabase client singleton
  types/          shared TypeScript interfaces
supabase/
  schema.sql      full DB schema, RLS policies, functions, storage bucket
```

## 8. Security notes (read this before deploying)

- **Passwords** are never handled by this app's own code — Supabase Auth stores a salted
  bcrypt hash in the protected `auth.users` table. The `profiles` table only stores
  non-secret data (name, email, mobile, address, `is_admin` flag).
- **No hardcoded admin password lives in the frontend bundle.** `/admin` uses the exact
  same `supabase.auth.signInWithPassword()` call as customer login. Admin powers come
  from the `profiles.is_admin` database flag, checked server-side by RLS policies — not
  from a string comparison in JavaScript that anyone could read in devtools.
- **Customers cannot grant themselves admin.** The `profiles_update_own` RLS policy lets a
  user edit their own name/address but explicitly blocks setting `is_admin = true`.
- **Orders can't be forged.** There is intentionally no `insert` RLS policy for orders.
  All order creation goes through the `place_order()` Postgres function, which is
  `SECURITY DEFINER`, locks the product row, re-validates stock, and recomputes the total
  from the authoritative `products.price` — a compromised or modified frontend cannot
  submit a fake price or exceed available stock.
- **Every table has Row Level Security enabled.** Customers can only ever read their own
  orders/cart/profile; only rows flagged `is_admin` can write to `products` or read all
  `orders`.
- **The `service_role` key is never used in this frontend.** Every privileged action is
  expressed as an RLS policy or a `SECURITY DEFINER` function instead, so there's no
  secret key sitting in browser-shipped code.
- **Client-side login throttling** in `AuthContext` is a UX speed bump only; the real
  brute-force protection is Supabase Auth's own server-side rate limiting.
- **Before going to production:** change the admin password immediately after first
  login (Supabase Dashboard → Authentication → Users → admin@mobilebar.com → reset
  password), enable email confirmation if you haven't already, and consider adding
  Supabase's CAPTCHA integration on the auth forms.

## 9. What's stubbed for you to extend

- Payment gateway — checkout currently places a cash-on-delivery style order; swap
  `Checkout.tsx`'s submit handler for Razorpay/Stripe once you're ready.
- Email notifications on order status change (Supabase Edge Functions + Resend/SendGrid
  is a natural fit).
- Image optimization/CDN — images upload as-is to Supabase Storage.
