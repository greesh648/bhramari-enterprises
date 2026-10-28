-- Bhramari Enterprises platform. Apply to the intended Supabase project as its
-- database owner, then apply the generated seed.sql. This file contains no keys.
-- Private Auth credentials remain exclusively in Supabase Auth.
begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
grant usage on schema public to anon, authenticated, service_role;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 100),
  email text not null default '' check (char_length(email) <= 254),
  phone text not null default '' check (char_length(phone) <= 25),
  whatsapp_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Membership is provisioned only through trusted database administration.
-- No customer or app admin can add/modify it through the Data API.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.admin_users where user_id = (select auth.uid())); $$;
revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated, service_role;

create table if not exists public.yoga_programmes (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 100),
  content jsonb not null check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 100000),
  display boolean not null default true,
  availability text not null default 'Enquiries open' check (availability in ('Enquiries open','Paused')),
  updated_at timestamptz not null default now(),
  constraint yoga_programme_content_slug check (content ? 'slug' and jsonb_typeof(content->'slug') = 'string' and content->>'slug' = id),
  constraint yoga_programme_content_title check (content ? 'title' and jsonb_typeof(content->'title') = 'string' and char_length(btrim(content->>'title')) between 2 and 150),
  constraint yoga_programme_content_timing check (content ? 'timing' and jsonb_typeof(content->'timing') = 'string' and char_length(btrim(content->>'timing')) between 2 and 100)
);

create table if not exists public.yoga_batches (
  id uuid primary key default gen_random_uuid(),
  programme_id text not null references public.yoga_programmes(id),
  name text not null check (char_length(btrim(name)) between 2 and 150),
  start_date date,
  end_date date,
  timing text not null check (char_length(btrim(timing)) between 2 and 100),
  capacity integer check (capacity between 1 and 10000),
  status text not null default 'Draft' check (status in ('Draft','Open','Confirmed','Completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint yoga_batch_dates check (start_date is null or end_date is null or end_date >= start_date),
  constraint yoga_batch_programme_pair unique (id, programme_id)
);

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null check (char_length(btrim(name)) between 2 and 100),
  email text not null check (char_length(email) between 3 and 254 and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text not null default '' check (char_length(phone) <= 25),
  enquiry_type text not null check (enquiry_type in ('General','Yoga & Wellness','Skill Development & Training','Agriculture & Livelihoods','CSR & Project Implementation','Consultancy','Consultancy Services','Food Products','Partnership','Other')),
  programme_id text references public.yoga_programmes(id),
  message text not null check (char_length(btrim(message)) between 10 and 5000),
  source_page text not null default '/' check (char_length(source_page) between 1 and 500 and left(source_page,1) = '/' and left(source_page,2) <> '//'),
  status text not null default 'New' check (status in ('New','Contacted','In Discussion','Closed')),
  whatsapp_opt_in boolean not null default false,
  privacy_accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.enquiry_notes (
  enquiry_id uuid primary key references public.enquiries(id) on delete cascade,
  owner_notes text not null default '' check (char_length(owner_notes) <= 5000),
  updated_at timestamptz not null default now()
);

create table if not exists public.yoga_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  programme_id text not null references public.yoga_programmes(id),
  batch_id uuid,
  enquiry_id uuid references public.enquiries(id) on delete set null,
  enrollment_status text not null default 'Enquiry Received' check (enrollment_status in ('Enquiry Received','Enrollment Pending','Confirmed','Completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enrollment_batch_programme foreign key (batch_id, programme_id) references public.yoga_batches(id, programme_id)
);

create unique index if not exists yoga_enrollments_one_open
  on public.yoga_enrollments(user_id, programme_id)
  where enrollment_status in ('Enquiry Received','Enrollment Pending','Confirmed');
create index if not exists yoga_enrollments_user on public.yoga_enrollments(user_id);
create index if not exists yoga_enrollments_batch on public.yoga_enrollments(batch_id);
create index if not exists enquiries_user on public.enquiries(user_id);
create index if not exists enquiries_status_created on public.enquiries(status, created_at desc);
create index if not exists yoga_batches_programme on public.yoga_batches(programme_id);

create table if not exists public.enrollment_notes (
  enrollment_id uuid primary key references public.yoga_enrollments(id) on delete cascade,
  admin_notes text not null default '' check (char_length(admin_notes) <= 5000),
  updated_at timestamptz not null default now()
);

-- These columns never appear in public catalogue requests, HTML, or source.
create table if not exists public.batch_access (
  batch_id uuid primary key references public.yoga_batches(id) on delete cascade,
  zoom_url text not null default '' check (char_length(zoom_url) <= 1000 and (zoom_url = '' or zoom_url ~ '^https://([a-zA-Z0-9-]+\.)?zoom\.us/')),
  zoom_meeting_id text not null default '' check (char_length(zoom_meeting_id) <= 100),
  zoom_passcode text not null default '' check (char_length(zoom_passcode) <= 100),
  whatsapp_group_url text not null default '' check (char_length(whatsapp_group_url) <= 1000 and (whatsapp_group_url = '' or whatsapp_group_url ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]+([/?].*)?$')),
  instructions text not null default '' check (char_length(instructions) <= 5000),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id text primary key default 'public' check (id = 'public'),
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 50000),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_reels (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 2 and 150),
  url text not null check (char_length(url) <= 1000 and url ~ '^https://(www\.)?instagram\.com/(reel|reels)/[A-Za-z0-9_-]+/?(\?.*)?$'),
  thumbnail_url text not null default '' check (char_length(thumbnail_url) <= 1000 and (thumbnail_url = '' or thumbnail_url ~ '^https://')),
  display_order integer not null default 0 check (display_order between 0 and 10000),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_blocks (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 100),
  title text not null default '' check (char_length(title) <= 200),
  body text not null default '' check (char_length(body) <= 10000),
  faqs jsonb not null default '[]'::jsonb check (jsonb_typeof(faqs) = 'array' and octet_length(faqs::text) <= 50000),
  updated_at timestamptz not null default now()
);

create table if not exists public.rate_limits (
  key text primary key check (char_length(key) between 1 and 200),
  window_start timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0)
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
revoke all on function public.set_updated_at() from public, anon, authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','yoga_programmes','yoga_batches','enquiry_notes','yoga_enrollments','enrollment_notes','batch_access','site_settings','social_reels','content_blocks'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name);
  end loop;
end;
$$;

-- New users receive a normal profile, never an admin role. Auth owns email.
create or replace function public.sync_auth_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.profiles(user_id, full_name, email, phone, whatsapp_opt_in)
    values(new.id,
      left(coalesce(new.raw_user_meta_data->>'full_name',''),100),
      left(coalesce(new.email,''),254),
      left(coalesce(new.phone,new.raw_user_meta_data->>'phone',''),25),
      coalesce(new.raw_user_meta_data->>'whatsapp_opt_in','false') = 'true')
    on conflict (user_id) do nothing;
  else
    update public.profiles set email = left(coalesce(new.email,''),254),
      phone = case when new.phone is distinct from old.phone and new.phone is not null then left(new.phone,25) else phone end
    where user_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.sync_auth_profile() from public, anon, authenticated;
drop trigger if exists bhramari_auth_profile_insert on auth.users;
create trigger bhramari_auth_profile_insert after insert on auth.users for each row execute function public.sync_auth_profile();
drop trigger if exists bhramari_auth_profile_update on auth.users;
create trigger bhramari_auth_profile_update after update of email, phone on auth.users for each row execute function public.sync_auth_profile();

-- Backfill existing Auth users without changing any existing profile.
insert into public.profiles(user_id, full_name, email, phone)
select id, left(coalesce(raw_user_meta_data->>'full_name',''),100), left(coalesce(email,''),254), left(coalesce(phone,raw_user_meta_data->>'phone',''),25)
from auth.users on conflict (user_id) do nothing;

-- Explicit grants plus RLS: having a JWT does not grant administrative access.
do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','admin_users','enquiries','enquiry_notes','yoga_programmes','yoga_batches','batch_access','yoga_enrollments','enrollment_notes','site_settings','social_reels','content_blocks','rate_limits'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon, authenticated', table_name);
    execute format('grant all on public.%I to service_role', table_name);
  end loop;
end;
$$;

grant select on public.profiles to authenticated;
grant update (full_name, phone, whatsapp_opt_in) on public.profiles to authenticated;
grant select on public.enquiries to authenticated;
grant update (status) on public.enquiries to authenticated;
grant select, insert, update on public.enquiry_notes, public.enrollment_notes to authenticated;
grant select on public.yoga_enrollments to authenticated;
grant insert, update on public.yoga_enrollments to authenticated;
grant select on public.yoga_programmes, public.yoga_batches, public.site_settings, public.social_reels, public.content_blocks to anon, authenticated;
grant insert, update, delete on public.yoga_programmes, public.yoga_batches, public.site_settings, public.social_reels, public.content_blocks to authenticated;
grant select, insert, update, delete on public.batch_access to authenticated;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- admin_users and rate_limits intentionally have no ordinary-role policies.

drop policy if exists enquiries_read on public.enquiries;
create policy enquiries_read on public.enquiries for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists enquiries_admin_update on public.enquiries;
create policy enquiries_admin_update on public.enquiries for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists enrollments_read on public.yoga_enrollments;
create policy enrollments_read on public.yoga_enrollments for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists enrollments_admin_insert on public.yoga_enrollments;
create policy enrollments_admin_insert on public.yoga_enrollments for insert to authenticated with check ((select public.is_admin()));
drop policy if exists enrollments_admin_update on public.yoga_enrollments;
create policy enrollments_admin_update on public.yoga_enrollments for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

do $$
declare table_name text;
begin
  foreach table_name in array array['enquiry_notes','enrollment_notes'] loop
    execute format('drop policy if exists notes_admin_read on public.%I', table_name);
    execute format('create policy notes_admin_read on public.%I for select to authenticated using ((select public.is_admin()))', table_name);
    execute format('drop policy if exists notes_admin_insert on public.%I', table_name);
    execute format('create policy notes_admin_insert on public.%I for insert to authenticated with check ((select public.is_admin()))', table_name);
    execute format('drop policy if exists notes_admin_update on public.%I', table_name);
    execute format('create policy notes_admin_update on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', table_name);
  end loop;
  foreach table_name in array array['yoga_programmes','yoga_batches','site_settings','social_reels','content_blocks','batch_access'] loop
    execute format('drop policy if exists content_admin_all on public.%I', table_name);
    execute format('create policy content_admin_all on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', table_name);
  end loop;
end;
$$;

drop policy if exists programmes_public_read on public.yoga_programmes;
create policy programmes_public_read on public.yoga_programmes for select to anon, authenticated using (display = true);
drop policy if exists programmes_enrolled_read on public.yoga_programmes;
create policy programmes_enrolled_read on public.yoga_programmes for select to authenticated using (exists(select 1 from public.yoga_enrollments e where e.programme_id = yoga_programmes.id and e.user_id = (select auth.uid())));
drop policy if exists batches_public_read on public.yoga_batches;
create policy batches_public_read on public.yoga_batches for select to anon, authenticated using (status in ('Open','Confirmed') and exists(select 1 from public.yoga_programmes p where p.id = yoga_batches.programme_id and p.display));
drop policy if exists batches_enrolled_read on public.yoga_batches;
create policy batches_enrolled_read on public.yoga_batches for select to authenticated using (exists(select 1 from public.yoga_enrollments e where e.batch_id = yoga_batches.id and e.user_id = (select auth.uid())));
drop policy if exists settings_public_read on public.site_settings;
create policy settings_public_read on public.site_settings for select to anon, authenticated using (id = 'public');
drop policy if exists reels_public_read on public.social_reels;
create policy reels_public_read on public.social_reels for select to anon, authenticated using (published = true);
drop policy if exists blocks_public_read on public.content_blocks;
create policy blocks_public_read on public.content_blocks for select to anon, authenticated using (true);
drop policy if exists batch_confirmed_participant_read on public.batch_access;
create policy batch_confirmed_participant_read on public.batch_access for select to authenticated using (
  exists(select 1 from public.yoga_enrollments e join public.yoga_batches b on b.id = e.batch_id
    where e.batch_id = batch_access.batch_id and e.user_id = (select auth.uid())
      and e.enrollment_status = 'Confirmed' and b.status = 'Confirmed')
);

-- Atomic, bounded budgets. The Worker supplies a salted hash, not a raw IP.
create or replace function public.consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare current_attempts integer;
begin
  if p_key is null or p_limit is null or p_window_seconds is null or char_length(p_key) not between 1 and 200 or p_limit not between 1 and 10000 or p_window_seconds not between 1 and 86400 then
    raise exception 'Invalid rate limit parameters' using errcode = '22023';
  end if;
  delete from public.rate_limits where window_start < now() - interval '2 days';
  insert into public.rate_limits as limits(key, window_start, attempts)
  values(p_key, now(), 1)
  on conflict (key) do update set
    attempts = case when limits.window_start <= now() - make_interval(secs => p_window_seconds) then 1 else least(limits.attempts + 1, p_limit + 1) end,
    window_start = case when limits.window_start <= now() - make_interval(secs => p_window_seconds) then now() else limits.window_start end
  returning attempts into current_attempts;
  return current_attempts <= p_limit;
end;
$$;
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

-- The Worker must verify Auth before passing p_user_id; callers cannot execute
-- this function with anon/authenticated privileges, even with a valid JWT.
create or replace function public.submit_enquiry(p_payload jsonb, p_user_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  enquiry_id uuid;
  enrollment_id uuid;
  programme text := nullif(btrim(p_payload->>'programme_id'),'');
  enquiry_name text := btrim(coalesce(p_payload->>'name',''));
  enquiry_email text := lower(btrim(coalesce(p_payload->>'email','')));
  enquiry_phone text := btrim(coalesce(p_payload->>'phone',''));
  enquiry_message text := btrim(coalesce(p_payload->>'message',''));
  enquiry_kind text := coalesce(p_payload->>'enquiry_type','General');
  source text := coalesce(p_payload->>'source_page','/');
  digits text;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 20000 then
    raise exception 'Invalid enquiry' using errcode = '22023';
  end if;
  if coalesce(p_payload->>'privacy','false') <> 'true' or coalesce(p_payload->>'website','') <> '' then
    raise exception 'Enquiry acknowledgement required' using errcode = '22023';
  end if;
  if char_length(enquiry_name) not between 2 and 100 or char_length(enquiry_message) not between 10 and 5000
    or char_length(enquiry_email) not between 3 and 254 or enquiry_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or char_length(source) not between 1 and 500 or left(source,1) <> '/' or left(source,2) = '//' then
    raise exception 'Invalid enquiry fields' using errcode = '22023';
  end if;
  digits := regexp_replace(enquiry_phone,'[^0-9]','','g');
  if enquiry_phone <> '' and (char_length(enquiry_phone) > 25 or enquiry_phone !~ '^[+()0-9[:space:]-]+$' or char_length(digits) not between 7 and 15) then
    raise exception 'Invalid phone number' using errcode = '22023';
  end if;
  if programme is not null then
    if enquiry_phone = '' or enquiry_kind <> 'Yoga & Wellness' then
      raise exception 'Yoga enquiry requires contact details' using errcode = '22023';
    end if;
    perform 1 from public.yoga_programmes where id = programme and display = true and availability = 'Enquiries open' for share;
    if not found then raise exception 'Programme is not accepting enquiries' using errcode = '22023'; end if;
  end if;
  if p_user_id is not null and not exists(select 1 from auth.users where id = p_user_id and (email_confirmed_at is not null or phone_confirmed_at is not null)) then
    raise exception 'Verified account required' using errcode = '22023';
  end if;
  insert into public.enquiries(user_id,name,email,phone,enquiry_type,programme_id,message,source_page,whatsapp_opt_in)
  values(p_user_id,enquiry_name,enquiry_email,enquiry_phone,enquiry_kind,programme,enquiry_message,source,coalesce(p_payload->>'whatsapp_opt_in','false') = 'true')
  returning id into enquiry_id;
  if programme is not null and p_user_id is not null then
    insert into public.yoga_enrollments(user_id,programme_id,enquiry_id,enrollment_status)
    values(p_user_id,programme,enquiry_id,'Enquiry Received')
    on conflict (user_id,programme_id) where enrollment_status in ('Enquiry Received','Enrollment Pending','Confirmed') do nothing
    returning id into enrollment_id;
    if enrollment_id is null then
      select id into enrollment_id from public.yoga_enrollments
      where user_id = p_user_id and programme_id = programme and enrollment_status in ('Enquiry Received','Enrollment Pending','Confirmed') limit 1;
    end if;
  end if;
  return jsonb_strip_nulls(jsonb_build_object('id',enquiry_id,'enrollmentId',enrollment_id));
end;
$$;
revoke all on function public.submit_enquiry(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.submit_enquiry(jsonb, uuid) to service_role;

comment on table public.admin_users is 'Trusted role membership. No browser/Data API write grants.';
comment on table public.batch_access is 'Private Zoom and WhatsApp group details. Confirmed assigned participants and administrators only.';
comment on table public.site_settings is 'Public settings only. Never store API secrets, passwords or private Zoom/group credentials here.';
comment on table public.rate_limits is 'Server-only short-lived salted request hashes; raw IP addresses are not stored.';
comment on function public.submit_enquiry(jsonb, uuid) is 'Server-only validated enquiry/enrollment transaction. p_user_id must come from verified Supabase Auth user.';

notify pgrst, 'reload schema';
commit;
