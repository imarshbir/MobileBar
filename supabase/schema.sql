-- =====================================================================
-- MOBILE BAR — Supabase / PostgreSQL schema (v2: multi-category catalog)
--
-- THIS REPLACES THE OLD PHONE-ONLY SCHEMA. Mobile Bar has pivoted from
-- selling phones to selling accessories (covers, skins, tempered glass,
-- watch straps, charger covers, cable protectors) across many brands.
--
-- If you're running this on a project that already has the old schema:
-- this file DROPS the old `products` table's phone-specific columns
-- (ram_gb, storage_gb, processor) and replaces it with a generalized
-- catalog. For a live store with existing orders, export them first —
-- for a fresh/test project, just run this top to bottom.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. PROFILES (unchanged from v1)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  full_name         text not null,
  email             text not null unique,
  mobile_number     text not null unique,
  shipping_address  text not null default '',
  is_admin          boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.profiles drop constraint if exists profiles_mobile_format;
alter table public.profiles
  add constraint profiles_mobile_format check (mobile_number ~ '^[0-9+][0-9 -]{6,14}$');

-- ---------------------------------------------------------------------
-- 2. BRANDS  (Apple, Samsung, OnePlus, Vivo, Oppo, Xiaomi/Redmi,
--    Realme, Motorola, Google Pixel, Nothing, Other)
-- ---------------------------------------------------------------------
create table if not exists public.brands (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  slug          text not null unique,
  logo_url      text default '',
  display_order int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. CATEGORIES  (Mobile Covers, Mobile Skins, Tempered Glass,
--    Gadget Skins, Watch Straps, Charger Covers, Cable Protectors)
--
-- filter_config declares which filter facets the Shop page shows for
-- this category, straight from the sitemap PDF's per-category filter
-- lists — the frontend reads this instead of hardcoding filters per
-- category, so adding a new category later needs zero code changes.
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique,
  slug            text not null unique,
  description     text default '',
  hero_image_url  text default '',
  filter_config   jsonb not null default '[]',
  display_order   int not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. PRODUCTS  (generalized — works for covers, skins, straps, cables)
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text unique,
  category_id         uuid not null references public.categories(id) on delete restrict,
  brand_id            uuid references public.brands(id) on delete set null,

  description         text default '',
  features            text[] not null default '{}',
  whats_included       text[] not null default '{}',
  delivery_info       text default 'Dispatched in 1–2 business days. See our Shipping Policy for delivery timelines.',
  return_policy       text default 'Eligible for return within 7 days of delivery if unused and in original packaging. See our Return & Refund Policy.',

  compatible_models    text[] not null default '{}',
  material             text default '',
  finish               text default '',
  color                text default '',

  price                numeric(10,2) not null check (price >= 0),
  discount_percent     numeric(5,2) not null default 0 check (discount_percent >= 0 and discount_percent <= 90),

  stock_quantity       int not null default 0 check (stock_quantity >= 0),
  image_urls           text[] not null default '{}',
  video_url            text default '',

  is_new_arrival        boolean not null default false,
  is_best_seller         boolean not null default false,
  is_featured           boolean not null default false,
  is_active            boolean not null default true,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_products_category on public.products (category_id);
create index if not exists idx_products_brand on public.products (brand_id);
create index if not exists idx_products_active on public.products (is_active);
create index if not exists idx_products_flags on public.products (is_new_arrival, is_best_seller, is_featured);

alter table public.products drop column if exists search_vector;
alter table public.products add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(name,'')), 'A') ||
    setweight(to_tsvector('english', array_to_string(compatible_models, ' ')), 'A') ||
    setweight(to_tsvector('english', coalesce(material,'') || ' ' || coalesce(finish,'') || ' ' || coalesce(color,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(description,'')), 'C')
  ) stored;
create index if not exists idx_products_search on public.products using gin (search_vector);

alter table public.products drop column if exists sale_price;
alter table public.products add column sale_price numeric(10,2)
  generated always as (round(price * (1 - discount_percent / 100.0), 2)) stored;

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

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 5. PRODUCT REVIEWS
-- ---------------------------------------------------------------------
create table if not exists public.product_reviews (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  customer_id   uuid not null references public.profiles(id) on delete cascade,
  rating        smallint not null check (rating between 1 and 5),
  comment       text default '',
  created_at    timestamptz not null default now(),
  unique (product_id, customer_id)
);

-- ---------------------------------------------------------------------
-- 6. WISHLIST
-- ---------------------------------------------------------------------
create table if not exists public.wishlist_items (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.profiles(id) on delete cascade,
  product_id    uuid not null references public.products(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (customer_id, product_id)
);

-- ---------------------------------------------------------------------
-- 7. SAVED ADDRESSES
-- ---------------------------------------------------------------------
create table if not exists public.customer_addresses (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid not null references public.profiles(id) on delete cascade,
  label           text not null default 'Home',
  full_name       text not null,
  mobile_number   text not null,
  address_line1   text not null,
  address_line2   text default '',
  landmark        text default '',
  city            text not null,
  state           text not null,
  pincode         text not null,
  is_default      boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 8. CART
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
-- 9. COUPONS  (used by orders below; Stage 2 wires up the cart UI)
-- ---------------------------------------------------------------------
create table if not exists public.coupons (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique,
  discount_type       text not null check (discount_type in ('percent','flat')),
  discount_value      numeric(10,2) not null check (discount_value >= 0),
  min_order_value     numeric(10,2) not null default 0,
  max_discount_amount numeric(10,2),
  usage_limit         int,
  times_used          int not null default 0,
  expires_at          timestamptz,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 10. ORDERS
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  customer_id         uuid not null references public.profiles(id) on delete restrict,
  customer_name       text not null,
  customer_mobile     text not null,
  customer_email      text not null default '',
  shipping_address    text not null,

  product_id          uuid not null references public.products(id) on delete restrict,
  product_name        text not null,
  unit_price          numeric(10,2) not null check (unit_price >= 0),
  quantity            int not null check (quantity > 0),

  coupon_code         text,
  coupon_discount     numeric(10,2) not null default 0,
  shipping_charges    numeric(10,2) not null default 0,
  taxable_value       numeric(10,2) not null default 0,
  gst_percent         numeric(5,2) not null default 18,
  gst_amount          numeric(10,2) not null default 0,
  total_price         numeric(10,2) not null check (total_price >= 0),

  payment_status      text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded')),
  payment_method       text default '',
  razorpay_order_id   text,
  razorpay_payment_id text,

  status              text not null default 'pending'
                       check (status in ('pending','confirmed','shipped','delivered','cancelled')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_orders_customer on public.orders (customer_id);
create index if not exists idx_orders_product on public.orders (product_id);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_created on public.orders (created_at desc);

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 11. Auto-create profile on signup (unchanged from v1)
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
-- 12. place_order()  — atomic, price/stock authoritative on the server.
--     Now also validates + applies a coupon server-side, and records
--     the GST breakdown your Sale_sheet.xlsx export needs.
-- ---------------------------------------------------------------------
create or replace function public.place_order(
  p_product_id  uuid,
  p_quantity    int,
  p_coupon_code text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile     public.profiles%rowtype;
  v_product     public.products%rowtype;
  v_coupon      public.coupons%rowtype;
  v_order       public.orders%rowtype;
  v_taxable     numeric(10,2);
  v_discount    numeric(10,2) := 0;
  v_gst_pct     numeric(5,2) := 18;
  v_gst_amt     numeric(10,2);
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

  select * into v_product from public.products where id = p_product_id for update;
  if not found or v_product.is_active = false then
    raise exception 'Product not available';
  end if;
  if v_product.stock_quantity < p_quantity then
    raise exception 'Insufficient stock: only % left', v_product.stock_quantity;
  end if;

  v_taxable := v_product.sale_price * p_quantity;

  if p_coupon_code is not null then
    select * into v_coupon from public.coupons
      where code = upper(p_coupon_code) and is_active = true
      for update;
    if found then
      if v_coupon.expires_at is not null and v_coupon.expires_at < now() then
        raise exception 'Coupon has expired';
      end if;
      if v_coupon.usage_limit is not null and v_coupon.times_used >= v_coupon.usage_limit then
        raise exception 'Coupon usage limit reached';
      end if;
      if v_taxable < v_coupon.min_order_value then
        raise exception 'Order does not meet minimum value for this coupon';
      end if;
      v_discount := case
        when v_coupon.discount_type = 'percent' then round(v_taxable * v_coupon.discount_value / 100.0, 2)
        else v_coupon.discount_value
      end;
      if v_coupon.max_discount_amount is not null and v_discount > v_coupon.max_discount_amount then
        v_discount := v_coupon.max_discount_amount;
      end if;
      if v_discount > v_taxable then v_discount := v_taxable; end if;

      update public.coupons set times_used = times_used + 1 where id = v_coupon.id;
    end if;
  end if;

  v_taxable := v_taxable - v_discount;
  v_gst_amt := round(v_taxable * v_gst_pct / 100.0, 2);

  update public.products set stock_quantity = stock_quantity - p_quantity where id = p_product_id;

  insert into public.orders (
    customer_id, customer_name, customer_mobile, customer_email, shipping_address,
    product_id, product_name, unit_price, quantity,
    coupon_code, coupon_discount, taxable_value, gst_percent, gst_amount, total_price,
    status, payment_status
  ) values (
    v_profile.id, v_profile.full_name, v_profile.mobile_number, v_profile.email, v_profile.shipping_address,
    v_product.id, v_product.name, v_product.sale_price, p_quantity,
    case when v_coupon.id is not null then v_coupon.code else null end, v_discount,
    v_taxable, v_gst_pct, v_gst_amt, v_taxable + v_gst_amt,
    'pending', 'pending'
  )
  returning * into v_order;

  delete from public.cart_items where customer_id = auth.uid() and product_id = p_product_id;

  return v_order;
end;
$$;

revoke all on function public.place_order(uuid, int, text) from public;
grant execute on function public.place_order(uuid, int, text) to authenticated;

-- ---------------------------------------------------------------------
-- 13. Bestsellers view for admin dashboard
-- ---------------------------------------------------------------------
create or replace view public.bestsellers as
select
  p.id as product_id,
  p.name,
  p.image_urls,
  p.sale_price as price,
  p.stock_quantity,
  coalesce(sum(o.quantity) filter (where o.created_at > now() - interval '30 days'), 0) as units_sold_30d,
  coalesce(sum(o.quantity), 0) as units_sold_all_time,
  coalesce(sum(o.total_price) filter (where o.status <> 'cancelled'), 0) as revenue_all_time
from public.products p
left join public.orders o on o.product_id = p.id and o.status <> 'cancelled'
group by p.id, p.name, p.image_urls, p.sale_price, p.stock_quantity
order by units_sold_30d desc, units_sold_all_time desc;

-- ---------------------------------------------------------------------
-- 14. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_reviews enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.cart_items enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;

create or replace function public.is_admin()
returns boolean
language sql security definer set search_path = public stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id and is_admin = false);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "brands_public_read" on public.brands;
create policy "brands_public_read" on public.brands for select using (true);
drop policy if exists "brands_admin_write" on public.brands;
create policy "brands_admin_write" on public.brands for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories for select using (true);
drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write" on public.categories for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
  for select using (is_active = true or public.is_admin());
drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "reviews_public_read" on public.product_reviews;
create policy "reviews_public_read" on public.product_reviews for select using (true);
drop policy if exists "reviews_owner_write" on public.product_reviews;
create policy "reviews_owner_write" on public.product_reviews for insert with check (auth.uid() = customer_id);
drop policy if exists "reviews_owner_update" on public.product_reviews;
create policy "reviews_owner_update" on public.product_reviews for update using (auth.uid() = customer_id) with check (auth.uid() = customer_id);
drop policy if exists "reviews_owner_delete" on public.product_reviews;
create policy "reviews_owner_delete" on public.product_reviews for delete using (auth.uid() = customer_id or public.is_admin());

drop policy if exists "wishlist_owner_all" on public.wishlist_items;
create policy "wishlist_owner_all" on public.wishlist_items for all using (auth.uid() = customer_id) with check (auth.uid() = customer_id);

drop policy if exists "addresses_owner_all" on public.customer_addresses;
create policy "addresses_owner_all" on public.customer_addresses for all using (auth.uid() = customer_id) with check (auth.uid() = customer_id);

drop policy if exists "cart_owner_all" on public.cart_items;
create policy "cart_owner_all" on public.cart_items for all using (auth.uid() = customer_id) with check (auth.uid() = customer_id);

drop policy if exists "coupons_public_read_active" on public.coupons;
create policy "coupons_public_read_active" on public.coupons for select using (is_active = true or public.is_admin());
drop policy if exists "coupons_admin_write" on public.coupons;
create policy "coupons_admin_write" on public.coupons for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin" on public.orders for select using (auth.uid() = customer_id or public.is_admin());
drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "orders_admin_delete" on public.orders;
create policy "orders_admin_delete" on public.orders for delete using (public.is_admin());

-- ---------------------------------------------------------------------
-- 15. STORAGE — product images (brand logos / category hero images
--     reuse the same bucket), admin-only write, public read
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
-- 16. ADMIN BOOTSTRAP — see README for the full walkthrough. Short version:
--   1. Authentication → Users → Add user → admin@mobilebar.com / a real
--      password. Tick "Auto Confirm User".
--   2. update public.profiles set is_admin = true where email = 'admin@mobilebar.com';
-- =====================================================================
