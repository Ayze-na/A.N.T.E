-- ============================================
-- A.N.T.E — Supabase schema (run in SQL editor)
-- ============================================

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$ begin
  create type public.product_type as enum ('scrub-half','scrub-full','coat-men','coat-women');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('instapay','orange_cash');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum ('pending','confirmed','shipped','delivered','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.customization_type as enum ('none','uploaded','preset');
exception when duplicate_object then null; end $$;

-- ---------- Tables ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  type public.product_type not null,
  fabric text not null default 'جبردين',
  description text,
  colors text[] not null default '{}',
  sizes text[] not null default '{}',
  image_urls text[] not null default '{}',
  price integer not null,
  currency text not null default 'EGP',
  customization_enabled boolean not null default false,
  out_of_stock boolean not null default false,
  discount_active boolean not null default false,
  discount_percentage integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.preset_logos (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  label text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  phone_1 text not null,
  phone_2 text not null,
  address text not null,
  city text not null,
  subtotal integer not null default 0,
  deposit_amount integer not null default 0,
  remaining_amount integer not null default 0,
  payment_method public.payment_method not null,
  payment_proof_url text,
  status public.order_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  size text not null,
  color text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price integer not null,
  customization_type public.customization_type not null default 'none',
  customization_logo_url_or_preset_id text,
  name_tag_text text
);

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  method public.payment_method not null unique,
  phone_number text not null,
  account_holder text not null default '',
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------- Defaults ----------
insert into public.products (name, slug, type, fabric, description, colors, sizes, image_urls, price, customization_enabled)
values
  ('اسكراب طويل كم — أزرق', 'scrub-full-blue', 'scrub-full', 'لين', 'اسكراب طبي قطن لين، خامة مريحة للاستخدام اليومي.', array['أزرق'], array['S','M','L','XL','XXL'], array['https://placehold.co/600x600/eff6ff/1e3a8a?text=Scrub'], 450),
  ('اسكراب قصير كم — أسود', 'scrub-half-black', 'scrub-half', 'لين', 'اسكراب طبي قصير الكم، لون أسود عصري.', array['أسود'], array['S','M','L','XL','XXL'], array['https://placehold.co/600x600/e2e8f0/0f172a?text=Scrub'], 420),
  ('أفرول طبي رجالي — أبيض', 'coat-men-white', 'coat-men', 'جبردين', 'أفرول طبي رجالي قماش جبردين فاخر.', array['أبيض'], array['M','L','XL','XXL'], array['https://placehold.co/600x600/f8fafc/1e3a8a?text=Coat'], 600),
  ('أفرول طبي حريمي — أبيض', 'coat-women-white', 'coat-women', 'جبردين', 'أفرول طبي حريمي بقصّة أنيقة.', array['أبيض'], array['M','L','XL','XXL'], array['https://placehold.co/600x600/f8fafc/1e3a8a?text=Coat'], 580);

insert into public.payment_methods (method, phone_number, account_holder) values
  ('instapay', '01000000000', 'A.N.T.E'),
  ('orange_cash', '01000000000', 'A.N.T.E');

-- ---------- Row Level Security ----------
alter table public.products enable row level security;
alter table public.preset_logos enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_methods enable row level security;
alter table public.settings enable row level security;

-- Products: everyone can read (storefront shows live data), admin writes.
create policy "products_read_all" on public.products for select using (true);

-- Preset logos: everyone can read active ones.
create policy "preset_logos_read_all" on public.preset_logos for select using (true);
create policy "preset_logos_read_inactive_admin" on public.preset_logos for select using (current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'authenticated');

-- Orders / order_items: only authenticated admin can access.
create policy "orders_admin_read" on public.orders for select using (auth.role() = 'authenticated');
create policy "orders_admin_write" on public.orders for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "order_items_admin_read" on public.order_items for select using (auth.role() = 'authenticated');
create policy "order_items_admin_write" on public.order_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Payment methods: public needs to see phone numbers at checkout.
create policy "payment_methods_read_all" on public.payment_methods for select using (true);

-- Settings: read for all (used for store config), write admin only.
create policy "settings_read_all" on public.settings for select using (true);

-- ---------- Storage buckets ----------
insert into storage.buckets (id, name, public) values
  ('product-images', 'product-images', true),
  ('preset-logos', 'preset-logos', true),
  ('uploaded-logos', 'uploaded-logos', false),
  ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- Public read on public buckets
create policy "product_images_public_read" on storage.objects for select using (bucket_id = 'product-images');
create policy "preset_logos_public_read" on storage.objects for select using (bucket_id = 'preset-logos');

-- Authenticated admin uploads to product-images / preset-logos
create policy "product_images_admin_upload" on storage.objects for insert with check (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "preset_logos_admin_upload" on storage.objects for insert with check (bucket_id = 'preset-logos' and auth.role() = 'authenticated');

-- Anyone can upload a logo (guest customization) into uploaded-logos
create policy "uploaded_logos_public_insert" on storage.objects for insert with check (bucket_id = 'uploaded-logos');

-- Payment proofs: public insert, authenticated read
create policy "payment_proofs_public_insert" on storage.objects for insert with check (bucket_id = 'payment-proofs');
create policy "payment_proofs_auth_read" on storage.objects for select using (bucket_id = 'payment-proofs' and auth.role() = 'authenticated');