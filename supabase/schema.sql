-- Dripping Honey Treats — temporary backend schema (Supabase / Postgres)
--
-- Paste this whole file into Supabase → SQL Editor → Run. Safe to re-run.
-- Then run supabase/seed.sql once to load the starting menu.
--
-- All money columns are integer KOBO (₦1 = 100 kobo), same as the app.
-- RLS is ON with no policies: the browser can never touch these tables
-- directly. Only the app's server routes (service-role key) can.

create extension if not exists pgcrypto;

-- ───────────────────────── Users & auth ─────────────────────────
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null default '',
  phone text unique,                -- E.164 e.g. +2348012345678
  email text unique,                -- always lower-case
  phone_verified boolean not null default false,
  email_verified boolean not null default false,
  role text not null default 'CUSTOMER' check (role in ('CUSTOMER','STAFF','SUPER_ADMIN')),
  avatar text,
  google_sub text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists otp_codes (
  id uuid primary key default gen_random_uuid(),
  contact text not null,
  code_hash text not null,
  purpose text not null default 'login',
  full_name text,
  attempts int not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists otp_codes_contact_idx on otp_codes (contact, created_at desc);

-- ───────────────────────── Catalogue ─────────────────────────
create table if not exists categories (
  id text primary key default ('cat-' || substr(gen_random_uuid()::text, 1, 8)),
  name text not null,
  slug text not null unique,
  image text,
  tagline text,
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists items (
  id text primary key default ('item-' || substr(gen_random_uuid()::text, 1, 8)),
  category_id text not null references categories(id) on update cascade,
  name text not null,
  description text,
  images jsonb not null default '[]',          -- ["https://…/photo.jpg"]
  base_price int not null default 0,           -- kobo
  status text not null default 'available'
    check (status in ('available','few_left','sold_out','pre_order')),
  max_qty int not null default 20,
  lead_time_hours int,
  variants jsonb not null default '[]',        -- [{"id":"v-x-1","name":"Pack of 3","price":400000}]
  badge text,
  ingredients jsonb,
  nutrition jsonb,                             -- {"kcal":486,"fat":"22.0 g",…}
  fibre jsonb,
  popular boolean not null default false,      -- shows in "Popular" on home
  sort int not null default 0,
  active boolean not null default true,        -- false = hidden from customers
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists items_category_idx on items (category_id);

create table if not exists banners (
  id text primary key default ('bn-' || substr(gen_random_uuid()::text, 1, 8)),
  title text not null,
  subtitle text,
  description text,
  image text not null,
  cta_type text default 'none',
  cta_target text,
  cta_label text,
  priority int not null default 0,
  active boolean not null default true,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists event_types (
  id text primary key default ('ev-' || substr(gen_random_uuid()::text, 1, 8)),
  name text not null,
  slug text not null unique,
  description text,
  image text,
  includes jsonb not null default '[]',
  sort int not null default 0,
  active boolean not null default true
);

-- Single-row settings table (id is always 1). Edit in Table Editor.
create table if not exists settings (
  id int primary key default 1 check (id = 1),
  delivery_fee int not null default 0,         -- unused: customers pay the rider on arrival
  free_delivery_threshold int,                 -- kobo; null = never free
  pause_orders boolean not null default false,
  whatsapp_number text,                        -- shown to customers, digits only e.g. 2348012345678
  updated_at timestamptz not null default now()
);
insert into settings (id) values (1) on conflict (id) do nothing;

create table if not exists promos (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                   -- store UPPER-CASE
  type text not null check (type in ('percent','fixed')),
  value int not null,                          -- percent (e.g. 10) or kobo
  min_order int,
  expires_at timestamptz,
  usage_limit int,
  used_count int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Orders ─────────────────────────
create table if not exists addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  label text not null default 'Home',
  formatted_address text not null,
  lat double precision not null default 0,
  lng double precision not null default 0,
  landmark text,
  note text,
  contact_phone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create sequence if not exists order_no_seq start 1001;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique default ('DHT' || nextval('order_no_seq')),
  user_id uuid not null references users(id) on delete cascade,
  status text not null default 'draft',
  subtotal int not null default 0,
  delivery_fee int not null default 0,
  discount int not null default 0,
  total int not null default 0,
  notes text,
  promo_code text,
  scheduled_for timestamptz,
  address_snapshot jsonb,
  distance_km double precision,
  delivery jsonb,                              -- {"riderName","riderPhone","etaMinutes"}
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_user_idx on orders (user_id, created_at desc);
create index if not exists orders_status_idx on orders (status);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  item_id text not null,
  variant_id text,
  name_snapshot text not null,
  unit_price int not null,
  qty int not null check (qty > 0),
  note text,
  image text,
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_idx on order_items (order_id);

create table if not exists order_status_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists order_status_logs_order_idx on order_status_logs (order_id, created_at);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  provider text not null,                      -- flutterwave | paystack | kora
  reference text not null unique,
  provider_tx_id text,
  amount int not null,                         -- kobo
  currency text not null default 'NGN',
  status text not null default 'pending' check (status in ('pending','success','failed')),
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_order_idx on payments (order_id);

-- ───────────────────────── Events ─────────────────────────
create sequence if not exists event_ref_seq start 501;

create table if not exists event_requests (
  id uuid primary key default gen_random_uuid(),
  ref_no text not null unique default ('EVT' || nextval('event_ref_seq')),
  user_id uuid not null references users(id) on delete cascade,
  type_id text,
  type text not null,
  title text,
  date text not null,
  time text not null default '',
  city text not null,
  venue_address text not null,
  guests int not null default 1,
  budget int,                                  -- kobo
  services jsonb not null default '[]',
  notes text,
  status text not null default 'submitted',
  quote_amount int,
  quote_note text,
  quote_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists event_requests_user_idx on event_requests (user_id, created_at desc);

-- ───────────────────────── Notification log ─────────────────────────
-- Every email / WhatsApp the app tries to send lands here. Check this
-- table first when someone says "I didn't get my code".
create table if not exists notification_log (
  id uuid primary key default gen_random_uuid(),
  channel text not null,                       -- email | whatsapp
  recipient text not null,
  kind text not null,                          -- otp | order_update | admin_alert | …
  status text not null,                        -- sent | failed | skipped
  error text,
  created_at timestamptz not null default now()
);
create index if not exists notification_log_created_idx on notification_log (created_at desc);

-- ───────────────────────── Pickup or delivery ─────────────────────────
-- Delivery fee is NOT charged online: the customer pays the rider on
-- arrival and must tick a box agreeing to that at checkout.
alter table orders add column if not exists fulfillment text not null default 'delivery'
  check (fulfillment in ('delivery', 'pickup'));
alter table orders add column if not exists delivery_fee_agreed boolean not null default false;
alter table settings add column if not exists pickup_enabled boolean not null default true;
alter table settings add column if not exists pickup_address text;   -- e.g. 12 Admiralty Way, Lekki
alter table settings add column if not exists pickup_hours text;     -- e.g. Mon–Sat, 9am–6pm

-- ───────────────────────── Marketing consent ─────────────────────────
-- "New on the menu" emails go only to customers with this on. Every such
-- email has a one-click unsubscribe link that turns it off.
alter table users add column if not exists marketing_opt_in boolean not null default true;

-- ───────────────────────── Phone sign-in with a PIN ─────────────────────────
-- Customers who use their WhatsApp number create a 4-digit PIN (stored only
-- as a salted scrypt hash). Wrong guesses are counted and the account is
-- locked for a while after too many, so PINs can't be brute-forced.
alter table users add column if not exists pin_hash text;
alter table users add column if not exists pin_failed_attempts int not null default 0;
alter table users add column if not exists pin_locked_until timestamptz;

-- Delivery addresses remember which state Google placed them in (Lagos check).
alter table addresses add column if not exists state text;
alter table addresses add column if not exists place_id text;

-- ───────────────────────── Lock everything down ─────────────────────────
alter table users enable row level security;
alter table otp_codes enable row level security;
alter table categories enable row level security;
alter table items enable row level security;
alter table banners enable row level security;
alter table event_types enable row level security;
alter table settings enable row level security;
alter table promos enable row level security;
alter table addresses enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_logs enable row level security;
alter table payments enable row level security;
alter table event_requests enable row level security;
alter table notification_log enable row level security;

-- Newer Supabase projects don't auto-grant table access to API roles.
-- Only the server (service_role / secret key) gets access — never anon or
-- authenticated, so browsers still can't read anything directly.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

-- Public bucket for product / promo photos uploaded from the admin dashboard.
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;
