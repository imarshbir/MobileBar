-- Optional: run this AFTER schema.sql to populate a few sample listings
-- so the storefront isn't empty on first run. Safe to skip or re-run.

insert into public.products
  (brand, model_name, description, ram_gb, storage_gb, color, processor, price, stock_quantity, image_urls, is_active)
values
  ('Apple', 'iPhone 15', 'A16 Bionic chip, Dynamic Island, 48MP main camera.', 6, 128, 'Black', 'Apple A16 Bionic', 69999, 24,
    '{"https://images.unsplash.com/photo-1592286927505-1def25115481?w=800"}', true),
  ('Apple', 'iPhone 15 Pro', 'Titanium design, A17 Pro chip, USB-C.', 8, 256, 'Natural Titanium', 'Apple A17 Pro', 129999, 12,
    '{"https://images.unsplash.com/photo-1696446702183-cbd13d31d3b7?w=800"}', true),
  ('Samsung', 'Galaxy S24', '120Hz AMOLED, Snapdragon 8 Gen 3, AI features.', 8, 256, 'Onyx Black', 'Snapdragon 8 Gen 3', 79999, 18,
    '{"https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800"}', true),
  ('Samsung', 'Galaxy S24 Ultra', '200MP camera, S Pen, titanium frame.', 12, 512, 'Titanium Gray', 'Snapdragon 8 Gen 3', 134999, 9,
    '{"https://images.unsplash.com/photo-1610792516307-ea5acd9c3b00?w=800"}', true),
  ('Google', 'Pixel 8', 'Tensor G3, Magic Eraser, 7 years of updates.', 8, 128, 'Hazel', 'Google Tensor G3', 59999, 15,
    '{"https://images.unsplash.com/photo-1598965675045-45c5e72c7d05?w=800"}', true),
  ('OnePlus', '12', '100W fast charging, Hasselblad camera, Snapdragon 8 Gen 3.', 16, 256, 'Flowy Emerald', 'Snapdragon 8 Gen 3', 64999, 20,
    '{"https://images.unsplash.com/photo-1533228100845-08145b01de14?w=800"}', true),
  ('Xiaomi', '14', 'Leica optics, Snapdragon 8 Gen 3, compact flagship.', 12, 256, 'Jade Green', 'Snapdragon 8 Gen 3', 54999, 30,
    '{"https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800"}', true),
  ('Apple', 'iPhone 14', 'A15 Bionic, Ceramic Shield, great battery life.', 6, 128, 'Blue', 'Apple A15 Bionic', 54999, 0,
    '{"https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=800"}', true)
on conflict do nothing;
