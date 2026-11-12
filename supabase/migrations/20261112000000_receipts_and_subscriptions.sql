-- Keepr: receipts and subscriptions, one row per item, owned by the signed-in user.
-- Row level security makes sure each user can only ever read or change their own rows.

create table public.receipts (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product text not null,
  retailer text not null,
  price_pence integer not null check (price_pence >= 0),
  purchase_date date not null,
  channel text not null check (channel in ('in_store', 'online')),
  payment_method text not null check (payment_method in ('credit_card', 'debit_card', 'cash', 'other')),
  return_window_days integer check (return_window_days >= 0),
  warranty_months integer check (warranty_months >= 0),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  price_pence integer not null check (price_pence >= 0),
  cycle text not null check (cycle in ('weekly', 'monthly', 'yearly')),
  next_renewal date not null,
  trial_ends date,
  updated_at timestamptz not null default now()
);

create index receipts_user_id_idx on public.receipts (user_id);
create index subscriptions_user_id_idx on public.subscriptions (user_id);

alter table public.receipts enable row level security;
alter table public.subscriptions enable row level security;

create policy "Users can read their own receipts" on public.receipts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can add their own receipts" on public.receipts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own receipts" on public.receipts
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own receipts" on public.receipts
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can read their own subscriptions" on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can add their own subscriptions" on public.subscriptions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own subscriptions" on public.subscriptions
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own subscriptions" on public.subscriptions
  for delete to authenticated using ((select auth.uid()) = user_id);
