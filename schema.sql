-- Splitly database. Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- (Already ran it? Don't run it again. Only run the "upi_id" line at the bottom if you skipped it.)
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, name text not null default 'Flatmate', upi_id text, created_at timestamptz default now());
create table public.flats (id uuid primary key default gen_random_uuid(), name text not null, invite_code text not null unique default upper(substr(md5(random()::text || clock_timestamp()::text),1,6)), created_by uuid not null references auth.users(id), created_at timestamptz default now());
create table public.flat_members (flat_id uuid references public.flats(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade, joined_at timestamptz default now(), primary key (flat_id, user_id));
create table public.expenses (id uuid primary key default gen_random_uuid(), flat_id uuid not null references public.flats(id) on delete cascade, description text not null, amount numeric(12,2) not null check (amount > 0), paid_by uuid not null references auth.users(id), created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz default now());
create table public.expense_splits (expense_id uuid references public.expenses(id) on delete cascade, user_id uuid references auth.users(id), share numeric(12,2) not null, primary key (expense_id, user_id));
create table public.settlements (id uuid primary key default gen_random_uuid(), flat_id uuid not null references public.flats(id) on delete cascade, from_user uuid not null references auth.users(id), to_user uuid not null references auth.users(id), amount numeric(12,2) not null check (amount > 0), status text not null default 'pending' check (status in ('pending','confirmed')), created_at timestamptz default now(), confirmed_at timestamptz);

create function public.is_member(f uuid) returns boolean language sql security definer stable set search_path = public as $$ select exists(select 1 from flat_members where flat_id = f and user_id = auth.uid()) $$;
create function public.shares_flat(u uuid) returns boolean language sql security definer stable set search_path = public as $$ select exists(select 1 from flat_members a join flat_members b on a.flat_id = b.flat_id where a.user_id = auth.uid() and b.user_id = u) $$;
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into profiles(id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name', 'Flatmate')); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create function public.create_flat(flat_name text) returns public.flats language plpgsql security definer set search_path = public as $$ declare f flats; begin insert into flats(name, created_by) values (flat_name, auth.uid()) returning * into f; insert into flat_members(flat_id, user_id) values (f.id, auth.uid()); return f; end $$;
create function public.join_flat(code text) returns uuid language plpgsql security definer set search_path = public as $$ declare fid uuid; begin select id into fid from flats where invite_code = upper(trim(code)); if fid is null then raise exception 'Invalid invite code'; end if; insert into flat_members(flat_id, user_id) values (fid, auth.uid()) on conflict do nothing; return fid; end $$;

alter table profiles enable row level security; alter table flats enable row level security; alter table flat_members enable row level security;
alter table expenses enable row level security; alter table expense_splits enable row level security; alter table settlements enable row level security;
create policy "read own and flatmate profiles" on profiles for select using (id = auth.uid() or shares_flat(id));
create policy "update own profile" on profiles for update using (id = auth.uid());
create policy "members read flat" on flats for select using (is_member(id));
create policy "members read members" on flat_members for select using (is_member(flat_id));
create policy "members read expenses" on expenses for select using (is_member(flat_id));
create policy "members add expenses" on expenses for insert with check (is_member(flat_id) and created_by = auth.uid());
create policy "members edit expenses" on expenses for update using (is_member(flat_id));
create policy "members delete expenses" on expenses for delete using (is_member(flat_id));
create policy "members use splits" on expense_splits for all using (exists(select 1 from expenses e where e.id = expense_id and is_member(e.flat_id))) with check (exists(select 1 from expenses e where e.id = expense_id and is_member(e.flat_id)));
create policy "members read settlements" on settlements for select using (is_member(flat_id));
create policy "payer or receiver adds settlement" on settlements for insert with check (is_member(flat_id) and (from_user = auth.uid() or to_user = auth.uid()));
create policy "receiver confirms settlement" on settlements for update using (to_user = auth.uid()) with check (to_user = auth.uid());
alter publication supabase_realtime add table expenses, expense_splits, settlements, flat_members;

-- Only needed if your profiles table has no upi_id column yet:
-- alter table public.profiles add column if not exists upi_id text;
-- notify pgrst, 'reload schema';
