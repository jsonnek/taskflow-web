-- TaskFlow sync schema — run this in the Supabase SQL editor (or `supabase db push`).
--
-- One generic table holds every synced collection. The app computes all views
-- client-side, so the server only needs per-user storage with LWW timestamps
-- and tombstones.

create table if not exists public.records (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  collection text        not null,
  id         text        not null,
  data       jsonb,               -- null when deleted
  deleted    boolean     not null default false,
  updated_at timestamptz not null,
  primary key (user_id, collection, id)
);

create index if not exists records_pull_idx
  on public.records (user_id, updated_at);

alter table public.records enable row level security;

create policy "Users can read own records"
  on public.records for select
  using (auth.uid() = user_id);

create policy "Users can insert own records"
  on public.records for insert
  with check (auth.uid() = user_id);

create policy "Users can update own records"
  on public.records for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own records"
  on public.records for delete
  using (auth.uid() = user_id);
