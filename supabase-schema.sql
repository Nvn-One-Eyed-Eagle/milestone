-- AppVault Complete Database Schema

-- Apps table
create table if not exists public.apps (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  name text not null,
  featured boolean not null default false,
  category text not null default 'App',
  emoji text not null default '📦',
  short_desc text not null default '',
  full_desc text not null default '',
  price integer not null default 0,
  features text[] default '{}',
  screenshots text[] default '{}',
  video_url text,
  download_url text,
  tutorial_url text,
  upvotes integer not null default 0,
  downvotes integer not null default 0
);

create index if not exists apps_featured_idx on public.apps (featured);
create index if not exists apps_category_idx on public.apps (category);

-- Ideas table (Coming Soon)
create table if not exists public.ideas (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default timezone('utc'::text, now()),
  name text not null,
  emoji text not null default '💡',
  description text not null default '',
  upvotes integer not null default 0,
  downvotes integer not null default 0
);

create index if not exists ideas_upvotes_idx on public.ideas (upvotes desc);

-- Submitted Ideas table (from Ideas page)
create table if not exists public.submitted_ideas (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default timezone('utc'::text, now()),
  name text not null,
  emoji text not null default '💡',
  category text not null default 'Other',
  description text not null default '',
  submitter text,
  upvotes integer not null default 0,
  downvotes integer not null default 0
);

create index if not exists submitted_ideas_category_idx on public.submitted_ideas (category);
create index if not exists submitted_ideas_upvotes_idx on public.submitted_ideas (upvotes desc);

-- Orders table
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
create index if not exists orders_razorpay_payment_id_idx on public.orders (razorpay_payment_id);

-- Set up RLS policies (optional - adjust based on your security needs)
-- Apps: Public read, authenticated write
alter table public.apps enable row level security;
create policy "Apps are viewable by everyone" on public.apps
  for select using (true);

-- Ideas: Public read, authenticated write
alter table public.ideas enable row level security;
create policy "Ideas are viewable by everyone" on public.ideas
  for select using (true);

-- Submitted Ideas: Public read
alter table public.submitted_ideas enable row level security;
create policy "Submitted ideas are viewable by everyone" on public.submitted_ideas
  for select using (true);

-- Orders: Only service role can write (handled by server)
alter table public.orders enable row level security;
create policy "Orders are viewable by authenticated users" on public.orders
  for select using (auth.role() = 'authenticated');
