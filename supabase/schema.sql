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
  ('اسكراب طويل كم — أزرق', 'scrub-full-blue', 'scrub-full', 'لين', 'اسكراب طبي قطن لين، خامة مريحة للاستخدام اليومي.', array['أزرق'], array['S','M','L','XL','XXL'], array['https://placehold.co/600x600/eff6ff/1e3a8a?text=Scrub'], 450, true),
  ('اسكراب قصير كم — أسود', 'scrub-half-black', 'scrub-half', 'لين', 'اسكراب طبي قصير الكم، لون أسود عصري.', array['أسود'], array['S','M','L','XL','XXL'], array['https://placehold.co/600x600/e2e8f0/0f172a?text=Scrub'], 420, true),
('بالطو طبي رجالي — أبيض', 'coat-men-white', 'coat-men', 'جبردين', 'بالطو طبي رجالي قماش جبردين فاخر.', array['أبيض'], array['M','L','XL','XXL'], array['https://placehold.co/600x600/f8fafc/1e3a8a?text=Coat'], 600, true),

  ('بالطو طبي حريمي — أبيض', 'coat-women-white', 'coat-women', 'جبردين', 'بالطو طبي حريمي بقصّة أنيقة.', array['أبيض'], array['M','L','XL','XXL'], array['https://placehold.co/600x600/f8fafc/1e3a8a?text=Coat'], 580, true);
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
create policy "products_admin_insert" on public.products for insert with check (auth.role() = 'authenticated');
create policy "products_admin_update" on public.products for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "products_admin_delete" on public.products for delete using (auth.role() = 'authenticated');

-- Preset logos: everyone can read active ones, admin manages.
create policy "preset_logos_read_all" on public.preset_logos for select using (true);
create policy "preset_logos_admin_insert" on public.preset_logos for insert with check (auth.role() = 'authenticated');
create policy "preset_logos_admin_update" on public.preset_logos for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "preset_logos_admin_delete" on public.preset_logos for delete using (auth.role() = 'authenticated');

-- Orders / order_items:
--   Guests place orders (insert is public to support guest checkout).
--   Only authenticated admin can read / update / delete.
create policy "orders_admin_read" on public.orders for select using (auth.role() = 'authenticated');
create policy "orders_guest_insert" on public.orders for insert with check (true);
create policy "orders_admin_update" on public.orders for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "orders_admin_delete" on public.orders for delete using (auth.role() = 'authenticated');
create policy "order_items_admin_read" on public.order_items for select using (auth.role() = 'authenticated');
create policy "order_items_guest_insert" on public.order_items for insert with check (true);
create policy "order_items_admin_update" on public.order_items for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "order_items_admin_delete" on public.order_items for delete using (auth.role() = 'authenticated');

-- Payment methods: public needs to see phone numbers at checkout.
create policy "payment_methods_read_all" on public.payment_methods for select using (true);

-- Settings: read for all (used for store config), write admin only.
create policy "settings_read_all" on public.settings for select using (true);
create policy "settings_admin_insert" on public.settings for insert with check (auth.role() = 'authenticated');
create policy "settings_admin_update" on public.settings for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------- Storage buckets ----------
insert into storage.buckets (id, name, public) values
  ('product-images', 'product-images', true),
  ('preset-logos', 'preset-logos', true),
  ('uploaded-logos', 'uploaded-logos', true),
  ('payment-proofs', 'payment-proofs', true)
on conflict (id) do update set public = excluded.public;

-- Public read on all buckets (proofs/logos are referenced by plain URLs)
create policy "product_images_public_read" on storage.objects for select using (bucket_id = 'product-images');
create policy "preset_logos_public_read" on storage.objects for select using (bucket_id = 'preset-logos');
create policy "uploaded_logos_public_read" on storage.objects for select using (bucket_id = 'uploaded-logos');
create policy "payment_proofs_public_read" on storage.objects for select using (bucket_id = 'payment-proofs');

-- Authenticated admin manages product-images / preset-logos
create policy "product_images_admin_upload" on storage.objects for insert with check (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "product_images_admin_update" on storage.objects for update using (bucket_id = 'product-images' and auth.role() = 'authenticated') with check (bucket_id = 'product-images');
create policy "product_images_admin_delete" on storage.objects for delete using (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "preset_logos_admin_upload" on storage.objects for insert with check (bucket_id = 'preset-logos' and auth.role() = 'authenticated');
create policy "preset_logos_admin_update" on storage.objects for update using (bucket_id = 'preset-logos' and auth.role() = 'authenticated') with check (bucket_id = 'preset-logos');
create policy "preset_logos_admin_delete" on storage.objects for delete using (bucket_id = 'preset-logos' and auth.role() = 'authenticated');

-- Anyone can upload a logo (guest customization) into uploaded-logos
create policy "uploaded_logos_public_insert" on storage.objects for insert with check (bucket_id = 'uploaded-logos');

-- Payment proofs: public insert (guest), public read (plain URL)
create policy "payment_proofs_public_insert" on storage.objects for insert with check (bucket_id = 'payment-proofs');

-- ---------- Admin auth (passwordless via Resend email links) ----------
-- Requires: "Allow new users to sign up" = OFF, Resend configured in
-- Authentication > Messaging, and this email pre-created via the OTP endpoint.
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
   confirmation_token, recovery_token, email_change_token_new)
select
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
  'authenticated', 'a.n.t.e162003@gmail.com', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
  '', '', ''
where not exists (select 1 from auth.users where email = 'a.n.t.e162003@gmail.com');

insert into auth.identities
  (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(), u.id, u.email,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email', now(), now(), now()
from auth.users u
where u.email = 'a.n.t.e162003@gmail.com'
  and not exists (select 1 from auth.identities i where i.user_id = u.id);