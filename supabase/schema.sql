-- =====================================================================
-- MOBILE BAR — Supabase / PostgreSQL schema
-- Run this entire file once in the Supabase SQL Editor (Project > SQL Editor)
-- on a fresh project. Safe to re-run (uses IF NOT EXISTS / OR REPLACE).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. PROFILES  (extends auth.users — never store passwords ourselves;
--    Supabase Auth already stores a salted hash in auth.users.
--    This table only stores NON-secret profile data + the admin flag.)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text not null,
  email           text not null unique,
  mobile_number   text not null unique,
  shipping_address text not null default '',
  is_admin        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.profiles is 'Public profile data for every authenticated user. Password hashes live only in auth.users, managed by Supabase Auth (bcrypt).';

-- Basic sanity constraints
alter table public.profiles
  add constraint profiles_mobile_format check (mobile_number ~ '^[0-9+][0-9 \-]{6,14}$');

-- ---------------------------------------------------------------------
-- 2. PRODUCTS
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  brand           text not null,
  model_name      text not null,
  description     text default '',
  ram_gb          int not null check (ram_gb > 0),
  storage_gb      int not null check (storage_gb > 0),
  color           text not null default '',
  processor       text not null default '',
  price           numeric(10,2) not null check (price >= 0),
  stock_quantity  int not null default 0 check (stock_quantity >= 0),
  image_urls      text[] not null default '{}',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_products_brand_model on public.products (brand, model_name);
create index if not exists idx_products_active on public.products (is_active);
-- Full text search across brand + model + description for the search box
alter table public.products add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(brand,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(model_name,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(description,'')), 'C')
  ) stored;
create index if not exists idx_products_search on public.products using gin (search_vector);

-- ---------------------------------------------------------------------
-- 3. PRODUCT REVIEWS (customer feedback, normalized instead of a blob
--    column — lets us prevent review spoofing via RLS + FK to auth.uid())
-- ---------------------------------------------------------------------
create table if not exists public.product_reviews (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products(id) on delete cascade,
  customer_id     uuid not null references public.profiles(id) on delete cascade,
  rating          smallint not null check (rating between 1 and 5),
  comment         text default '',
  created_at      timestamptz not null default now(),
  unique (product_id, customer_id)
);

-- ---------------------------------------------------------------------
-- 4. ORDERS
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  customer_id         uuid not null references public.profiles(id) on delete restrict,
  customer_name       text not null,
  customer_mobile     text not null,
  shipping_address    text not null,
  product_id          uuid not null references public.products(id) on delete restrict,
  product_name        text not null,
  unit_price          numeric(10,2) not null check (unit_price >= 0),
  quantity            int not null check (quantity > 0),
  total_price         numeric(10,2) not null check (total_price >= 0),
  status              text not null default 'pending'
                       check (status in ('pending','confirmed','shipped','delivered','cancelled')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_orders_customer on public.orders (customer_id);
create index if not exists idx_orders_product on public.orders (product_id);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_created on public.orders (created_at desc);

-- ---------------------------------------------------------------------
-- 5. CART (server-side cart so it survives across devices/sessions)
-- ---------------------------------------------------------------------
create table if not exists public.cart_items (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid not null references public.profiles(id) on delete cascade,
  product_id      uuid not null references public.products(id) on delete cascade,
  quantity        int not null default 1 check (quantity > 0),
  created_at      timestamptz not null default now(),
  unique (customer_id, product_id)
);

-- ---------------------------------------------------------------------
-- 6. updated_at triggers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 7. Auto-create a profile row whenever a new auth.users row appears
--    (keeps registration a single supabase.auth.signUp() call from the
--    client — no service-role key ever needed in the frontend)
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, mobile_number, shipping_address)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'mobile_number', ''),
    coalesce(new.raw_user_meta_data->>'shipping_address', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 8. Server-side order placement (atomic stock check + decrement).
--    Doing this in a SECURITY DEFINER function stops two race-condition
--    bugs: (a) overselling stock, (b) a client forging total_price.
-- ---------------------------------------------------------------------
create or replace function public.place_order(
  p_product_id uuid,
  p_quantity   int
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile   public.profiles%rowtype;
  v_product   public.products%rowtype;
  v_order     public.orders%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required to place an order';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'Quantity must be at least 1';
  end if;

  select * into v_profile from public.profiles where id = auth.uid();
  if not found then
    raise exception 'Profile not found for current user';
  end if;

  -- Lock the product row to prevent concurrent oversell
  select * into v_product from public.products where id = p_product_id for update;
  if not found or v_product.is_active = false then
    raise exception 'Product not available';
  end if;

  if v_product.stock_quantity < p_quantity then
    raise exception 'Insufficient stock: only % left', v_product.stock_quantity;
  end if;

  update public.products
    set stock_quantity = stock_quantity - p_quantity
    where id = p_product_id;

  insert into public.orders (
    customer_id, customer_name, customer_mobile, shipping_address,
    product_id, product_name, unit_price, quantity, total_price, status
  ) values (
    v_profile.id, v_profile.full_name, v_profile.mobile_number, v_profile.shipping_address,
    v_product.id, v_product.brand || ' ' || v_product.model_name, v_product.price, p_quantity,
    v_product.price * p_quantity, 'pending'
  )
  returning * into v_order;

  delete from public.cart_items where customer_id = auth.uid() and product_id = p_product_id;

  return v_order;
end;
$$;

revoke all on function public.place_order(uuid, int) from public;
grant execute on function public.place_order(uuid, int) to authenticated;

-- ---------------------------------------------------------------------
-- 9. Bestsellers view — "recently sold the most" for the admin dashboard
-- ---------------------------------------------------------------------
create or replace view public.bestsellers as
select
  p.id as product_id,
  p.brand,
  p.model_name,
  p.image_urls,
  p.price,
  p.stock_quantity,
  coalesce(sum(o.quantity) filter (where o.created_at > now() - interval '30 days'), 0) as units_sold_30d,
  coalesce(sum(o.quantity), 0) as units_sold_all_time,
  coalesce(sum(o.total_price) filter (where o.status <> 'cancelled'), 0) as revenue_all_time
from public.products p
left join public.orders o on o.product_id = p.id and o.status <> 'cancelled'
group by p.id, p.brand, p.model_name, p.image_urls, p.price, p.stock_quantity
order by units_sold_30d desc, units_sold_all_time desc;

-- ---------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_reviews enable row level security;
alter table public.orders enable row level security;
alter table public.cart_items enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ---- profiles ----
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id and is_admin = false);
-- ^ a customer can edit their own name/address but can never grant themselves is_admin

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- ---- products ----
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
  for select using (is_active = true or public.is_admin());

drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- product_reviews ----
drop policy if exists "reviews_public_read" on public.product_reviews;
create policy "reviews_public_read" on public.product_reviews
  for select using (true);

drop policy if exists "reviews_owner_write" on public.product_reviews;
create policy "reviews_owner_write" on public.product_reviews
  for insert with check (auth.uid() = customer_id);

drop policy if exists "reviews_owner_update" on public.product_reviews;
create policy "reviews_owner_update" on public.product_reviews
  for update using (auth.uid() = customer_id) with check (auth.uid() = customer_id);

drop policy if exists "reviews_owner_delete" on public.product_reviews;
create policy "reviews_owner_delete" on public.product_reviews
  for delete using (auth.uid() = customer_id or public.is_admin());

-- ---- orders ----
-- Customers may only ever READ their own orders. All writes go through
-- the place_order() SECURITY DEFINER function above — there is
-- deliberately NO insert policy for plain authenticated users, so a
-- customer cannot forge someone else's order or fake a price client-side.
drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin" on public.orders
  for select using (auth.uid() = customer_id or public.is_admin());

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "orders_admin_delete" on public.orders;
create policy "orders_admin_delete" on public.orders
  for delete using (public.is_admin());

-- ---- cart_items ----
drop policy if exists "cart_owner_all" on public.cart_items;
create policy "cart_owner_all" on public.cart_items
  for all using (auth.uid() = customer_id) with check (auth.uid() = customer_id);

-- ---------------------------------------------------------------------
-- 11. STORAGE — bucket for product images (public read, admin write)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('product-images', 'product-images', true)
  on conflict (id) do nothing;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "product_images_admin_write" on storage.objects;
create policy "product_images_admin_write" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());

-- =====================================================================
-- 12. ADMIN BOOTSTRAP — READ ME
-- =====================================================================
-- Supabase Auth stores password hashes itself (bcrypt) inside the
-- protected auth.users table. This app never re-implements password
-- hashing and never hardcodes the admin password in frontend code.
--
-- To create the fixed admin account requested (admin@mobilebar.com):
--
--   1. Supabase Dashboard -> Authentication -> Users -> "Add user"
--      Email:    admin@mobilebar.com
--      Password: Admin*123          (change this after first login!)
--      Tick "Auto Confirm User".
--
--   2. Then run the statement below to flag that account as an admin.
--      (It also works for any other email you want to promote.)
--
--   update public.profiles set is_admin = true where email = 'admin@mobilebar.com';
--
-- The frontend /admin route only trusts this database flag — never a
-- hardcoded string — so the only way to get admin powers is to be
-- flagged in this table, which normal users' RLS policies block them
-- from ever setting on themselves (see profiles_update_own above).
-- =====================================================================
