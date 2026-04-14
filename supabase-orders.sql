create table if not exists public.orders (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default timezone('utc'::text, now()),
  app_id bigint not null,
  app_name text not null,
  customer_email text not null,
  amount integer not null,
  currency text not null default 'INR',
  referral_code text,
  razorpay_order_id text not null unique,
  razorpay_payment_id text not null unique,
  payment_signature text not null,
  license_key text not null unique,
  download_url text,
  tutorial_url text,
  status text not null default 'paid'
);

create index if not exists orders_customer_email_idx on public.orders (customer_email);
create index if not exists orders_app_id_idx on public.orders (app_id);

create table if not exists public.order_access_accounts (
  customer_email text primary key,
  password_hash text not null,
  password_salt text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
