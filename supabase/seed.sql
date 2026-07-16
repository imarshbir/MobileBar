-- Run AFTER schema.sql. Populates categories (with the exact filters
-- from the sitemap PDF), brands, and a few sample products per category
-- so the storefront isn't empty on first run.

-- ---------------------------------------------------------------------
-- Categories — filter_config matches the sitemap PDF's per-category
-- filter lists exactly.
-- ---------------------------------------------------------------------
insert into public.categories (name, slug, description, filter_config, display_order) values
  ('Mobile Covers', 'mobile-covers', 'Protective, stylish covers for every phone model.',
    '["brand","model","material","design","color","price"]', 1),
  ('Mobile Skins', 'mobile-skins', 'Slim wraps that protect without adding bulk.',
    '["brand","model","finish","color","price"]', 2),
  ('Tempered Glass', 'tempered-glass', 'Screen protection engineered for clarity and impact resistance.',
    '["brand","model","material","color","price"]', 3),
  ('Gadget Skins', 'gadget-skins', 'Wraps for laptops, tablets, and other everyday gadgets.',
    '["gadget","finish","design","color"]', 4),
  ('Watch Straps', 'watch-straps', 'Straps for every wrist and every watch.',
    '["watch_brand","watch_size","material","color"]', 5),
  ('Charger Covers', 'charger-covers', 'Personalize the charger you carry everywhere.',
    '["charger_type","brand","color","design"]', 6),
  ('Cable Protectors', 'cable-protectors', 'Keep your cables tangle-free and damage-free.',
    '["cable_type","design","color"]', 7)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------
-- Brands — from the sitemap PDF's "Shop by Brand" list
-- ---------------------------------------------------------------------
insert into public.brands (name, slug, display_order) values
  ('Apple', 'apple', 1),
  ('Samsung', 'samsung', 2),
  ('OnePlus', 'oneplus', 3),
  ('Vivo', 'vivo', 4),
  ('Oppo', 'oppo', 5),
  ('Xiaomi / Redmi', 'xiaomi-redmi', 6),
  ('Realme', 'realme', 7),
  ('Motorola', 'motorola', 8),
  ('Google Pixel', 'google-pixel', 9),
  ('Nothing', 'nothing', 10),
  ('Other Brands', 'other-brands', 11)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------
-- Sample products, spread across categories/brands, with the fields
-- your PDF's Product Page section calls for (features, what's
-- included, discount, compatible models).
-- ---------------------------------------------------------------------
do $$
declare
  cat_covers uuid := (select id from public.categories where slug = 'mobile-covers');
  cat_skins uuid := (select id from public.categories where slug = 'mobile-skins');
  cat_glass uuid := (select id from public.categories where slug = 'tempered-glass');
  cat_straps uuid := (select id from public.categories where slug = 'watch-straps');
  cat_cables uuid := (select id from public.categories where slug = 'cable-protectors');
  brand_apple uuid := (select id from public.brands where slug = 'apple');
  brand_samsung uuid := (select id from public.brands where slug = 'samsung');
  brand_oneplus uuid := (select id from public.brands where slug = 'oneplus');
begin
  insert into public.products
    (name, category_id, brand_id, description, features, whats_included, compatible_models, material, finish, color,
     price, discount_percent, stock_quantity, image_urls, is_new_arrival, is_best_seller, is_featured)
  values
    ('Titan Armor Case', cat_covers, brand_apple,
      'Military-grade drop protection with a raised bezel to keep your screen and camera safe.',
      '{"12ft drop protection","Raised camera bezel","Wireless charging compatible","Anti-yellowing"}',
      '{"1x Titan Armor Case"}',
      '{"iPhone 15","iPhone 15 Pro","iPhone 14"}', 'Polycarbonate + TPU', 'Matte', 'Midnight Black',
      699, 15, 42, '{"https://images.unsplash.com/photo-1601593346740-925612772716?w=800"}', true, true, true),
    ('Carbon Fiber Skin', cat_skins, brand_samsung,
      'Ultra-thin 3M vinyl wrap with a genuine carbon fiber texture.',
      '{"3M adhesive","Bubble-free application","Scratch resistant"}',
      '{"1x Skin","1x Application card"}',
      '{"Galaxy S24","Galaxy S24 Ultra"}', 'Vinyl', 'Carbon', 'Graphite',
      399, 10, 60, '{"https://images.unsplash.com/photo-1592286927505-1def25115481?w=800"}', true, false, true),
    ('Edge-to-Edge Tempered Glass', cat_glass, brand_oneplus,
      '9H hardness glass with oleophobic coating for fingerprint resistance.',
      '{"9H hardness","Oleophobic coating","Case-friendly edges","Bubble-free install kit"}',
      '{"2x Tempered Glass","1x Cleaning kit","1x Dust removal sticker"}',
      '{"OnePlus 12","OnePlus 11"}', 'Tempered Glass', 'Clear', 'Transparent',
      299, 0, 85, '{"https://images.unsplash.com/photo-1583573636244-b1922db4f38a?w=800"}', false, true, false),
    ('Woven Nylon Watch Strap', cat_straps, null,
      'Breathable woven nylon strap with a matte steel buckle.',
      '{"Breathable weave","Adjustable fit","Sweat resistant"}',
      '{"1x Strap","1x Adjustment tool"}',
      '{}', 'Nylon', 'Woven', 'Forest Green',
      499, 20, 30, '{"https://images.unsplash.com/photo-1620625515032-6ed0c1790c75?w=800"}', true, false, false),
    ('Braided Cable Protector Set', cat_cables, null,
      'Prevents fraying at the connector — the single most common point of cable failure.',
      '{"Fits USB-C and Lightning","Flexible silicone","Set of 4"}',
      '{"4x Cable Protectors (assorted colors)"}',
      '{}', 'Silicone', 'Braided', 'Assorted',
      149, 0, 120, '{"https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800"}', false, false, false)
  on conflict do nothing;
end $$;
