create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  category text not null,
  expense_source text,
  note text,
  expense_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.expenses add column if not exists expense_source text;

alter table public.expenses enable row level security;

drop policy if exists "read own expenses" on public.expenses;
drop policy if exists "insert own expenses" on public.expenses;
drop policy if exists "update own expenses" on public.expenses;
drop policy if exists "delete own expenses" on public.expenses;

create policy "read own expenses"
  on public.expenses
  for select
  using (auth.uid() = user_id);

create policy "insert own expenses"
  on public.expenses
  for insert
  with check (auth.uid() = user_id);

create policy "update own expenses"
  on public.expenses
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own expenses"
  on public.expenses
  for delete
  using (auth.uid() = user_id);

create table if not exists public.income_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  details text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.income_sources add column if not exists details text;

alter table public.income_sources enable row level security;

drop policy if exists "read own income sources" on public.income_sources;
drop policy if exists "insert own income sources" on public.income_sources;
drop policy if exists "update own income sources" on public.income_sources;
drop policy if exists "delete own income sources" on public.income_sources;

create policy "read own income sources"
  on public.income_sources
  for select
  using (auth.uid() = user_id);

create policy "insert own income sources"
  on public.income_sources
  for insert
  with check (auth.uid() = user_id);

create policy "update own income sources"
  on public.income_sources
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own income sources"
  on public.income_sources
  for delete
  using (auth.uid() = user_id);

create table if not exists public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  source text not null,
  note text,
  income_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.incomes enable row level security;

drop policy if exists "read own incomes" on public.incomes;
drop policy if exists "insert own incomes" on public.incomes;
drop policy if exists "update own incomes" on public.incomes;
drop policy if exists "delete own incomes" on public.incomes;

create policy "read own incomes"
  on public.incomes
  for select
  using (auth.uid() = user_id);

create policy "insert own incomes"
  on public.incomes
  for insert
  with check (auth.uid() = user_id);

create policy "update own incomes"
  on public.incomes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own incomes"
  on public.incomes
  for delete
  using (auth.uid() = user_id);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  person_name text not null,
  amount numeric(12, 2) not null default 0,
  entry_type text not null default 'given',
  title text not null,
  category text not null,
  details text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notes add column if not exists person_name text;
alter table public.notes add column if not exists amount numeric(12, 2) not null default 0;
alter table public.notes add column if not exists entry_type text not null default 'given';

alter table public.notes enable row level security;

drop policy if exists "read own notes" on public.notes;
drop policy if exists "insert own notes" on public.notes;
drop policy if exists "update own notes" on public.notes;
drop policy if exists "delete own notes" on public.notes;

create policy "read own notes"
  on public.notes
  for select
  using (auth.uid() = user_id);

create policy "insert own notes"
  on public.notes
  for insert
  with check (auth.uid() = user_id);

create policy "update own notes"
  on public.notes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own notes"
  on public.notes
  for delete
  using (auth.uid() = user_id);

create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  from_account text not null,
  to_account text not null,
  amount numeric(12, 2) not null check (amount > 0),
  note text,
  transfer_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transfers enable row level security;

drop policy if exists "read own transfers" on public.transfers;
drop policy if exists "insert own transfers" on public.transfers;
drop policy if exists "update own transfers" on public.transfers;
drop policy if exists "delete own transfers" on public.transfers;

create policy "read own transfers"
  on public.transfers
  for select
  using (auth.uid() = user_id);

create policy "insert own transfers"
  on public.transfers
  for insert
  with check (auth.uid() = user_id);

create policy "update own transfers"
  on public.transfers
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own transfers"
  on public.transfers
  for delete
  using (auth.uid() = user_id);
