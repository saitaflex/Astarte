-- ARTSART core schema: identity, artists, catalog, events, moderation, audit.
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

-- ---------- helpers ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- ---------- profiles (one per auth user) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('customer','artist','admin')),
  display_name text not null default '',
  locale text not null default 'en' check (locale in ('en','fr','ar')),
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles for each row execute function touch_updated_at();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'active')
$$;

-- New auth users get a profile. The role can only ever be customer or artist here;
-- admins are promoted by scripts/create-admin.ts with the service role.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare requested text := coalesce(new.raw_user_meta_data->>'account_type', 'customer');
begin
  insert into profiles (id, role, display_name, locale)
  values (
    new.id,
    case when requested = 'artist' then 'artist' else 'customer' end,
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    case when new.raw_user_meta_data->>'locale' in ('en','fr','ar') then new.raw_user_meta_data->>'locale' else 'en' end
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Users may edit their own name and locale, never their role or status.
create or replace function public.protect_profile_fields() returns trigger
language plpgsql as $$
begin
  if (new.role <> old.role or new.status <> old.status) and not is_admin() and current_user not in ('postgres','service_role') then
    raise exception 'role and status can only be changed by an administrator';
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles for each row execute function protect_profile_fields();

-- ---------- taxonomy ----------
create table public.categories (
  slug text primary key,
  name_en text not null, name_fr text not null, name_ar text not null,
  atmosphere text not null check (atmosphere in ('music','paint','clay','textile','photo','design','material')),
  sort int not null default 0,
  active boolean not null default true
);

-- ---------- artists ----------
create table public.artist_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  display_name text not null check (length(display_name) between 2 and 80),
  bio text not null default '' check (length(bio) <= 2000),
  primary_category text not null references public.categories(slug),
  specialties text[] not null default '{}',
  accepts_commissions boolean not null default true,
  availability text not null default 'accepting' check (availability in ('accepting','limited','not_accepting')),
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','changes_requested','rejected')),
  verification_status text not null default 'not_requested' check (verification_status in ('not_requested','pending','verified')),
  -- [{channel, value, public}] — only entries with public=true are exposed
  contact jsonb not null default '[]',
  is_demo boolean not null default false,
  profile_views int not null default 0,
  contact_clicks int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index artist_profiles_approval_idx on public.artist_profiles (approval_status);
create index artist_profiles_name_trgm on public.artist_profiles using gin (display_name gin_trgm_ops);
create trigger artist_profiles_touch before update on public.artist_profiles for each row execute function touch_updated_at();

-- Artists cannot approve or verify themselves.
create or replace function public.protect_artist_fields() returns trigger
language plpgsql as $$
begin
  if not is_admin() and current_user not in ('postgres','service_role') then
    if new.approval_status <> old.approval_status or new.verification_status <> old.verification_status
       or new.is_demo <> old.is_demo or new.user_id is distinct from old.user_id
       or new.profile_views <> old.profile_views or new.contact_clicks <> old.contact_clicks then
      raise exception 'protected artist fields can only be changed by the platform';
    end if;
  end if;
  return new;
end $$;
create trigger artist_profiles_protect before update on public.artist_profiles for each row execute function protect_artist_fields();

create or replace function public.my_artist_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from artist_profiles where user_id = auth.uid()
$$;

create table public.artist_categories (
  artist_id uuid references public.artist_profiles(id) on delete cascade,
  category_slug text references public.categories(slug),
  primary key (artist_id, category_slug)
);

create table public.locations (
  artist_id uuid primary key references public.artist_profiles(id) on delete cascade,
  city text not null,
  region text not null default '',
  country text not null default 'Tunisia',
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  privacy text not null default 'approximate_city' check (privacy in ('public_workshop','approximate_city','service_area','hidden')),
  service_radius_km int check (service_radius_km between 1 and 500)
);
create index locations_city_idx on public.locations (city);

-- ---------- catalog ----------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artist_profiles(id) on delete cascade,
  title text not null check (length(title) between 2 and 120),
  description text not null default '' check (length(description) <= 4000),
  price_amount numeric(10,2) check (price_amount >= 0),
  currency text not null default 'TND' check (currency in ('TND','EUR','USD')),
  availability text not null default 'in_stock' check (availability in ('in_stock','made_to_order','unavailable')),
  stock int check (stock >= 0),
  materials text[] not null default '{}',
  delivery_options text[] not null default '{pickup}',
  delivery_note text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  featured boolean not null default false,
  views int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (delivery_options <@ array['pickup','local_delivery','shipping']::text[])
);
create index products_artist_idx on public.products (artist_id);
create index products_status_idx on public.products (status);
create index products_title_trgm on public.products using gin (title gin_trgm_ops);
create trigger products_touch before update on public.products for each row execute function touch_updated_at();

create table public.product_categories (
  product_id uuid references public.products(id) on delete cascade,
  category_slug text references public.categories(slug),
  primary key (product_id, category_slug)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artist_profiles(id) on delete cascade,
  title text not null check (length(title) between 2 and 120),
  description text not null default '',
  price_from numeric(10,2) check (price_from >= 0),
  currency text not null default 'TND',
  pricing_note text,
  status text not null default 'published' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now()
);
create table public.service_categories (
  service_id uuid references public.services(id) on delete cascade,
  category_slug text references public.categories(slug),
  primary key (service_id, category_slug)
);

-- ---------- portfolio & product images ----------
create table public.portfolio_images (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artist_profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  original_path text not null,           -- private bucket
  web_path text,                         -- private web variant (metadata stripped)
  public_path text,                      -- public bucket, set only after approval
  mime text not null,
  size_bytes int not null,
  width int, height int,
  sha256 text not null,
  caption text,
  sort int not null default 0,
  moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','changes_requested','rejected')),
  authenticity_state text not null default 'not_assessed' check (authenticity_state in ('human_evidence','ai_indicators','uncertain','not_assessed')),
  created_at timestamptz not null default now()
);
create index portfolio_images_queue_idx on public.portfolio_images (moderation_status, created_at);
create index portfolio_images_product_idx on public.portfolio_images (product_id);

create table public.authenticity_assessments (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null references public.portfolio_images(id) on delete cascade,
  provider text not null,
  model_id text,
  model_version text,
  state text not null check (state in ('human_evidence','ai_indicators','uncertain','not_assessed')),
  score numeric,
  score_calibrated boolean not null default false,
  signals jsonb not null default '{}',
  note text,
  created_at timestamptz not null default now()
);

create table public.moderation_reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references public.profiles(id),
  target_type text not null check (target_type in ('portfolio_image','artist_profile','product','event','reward_offer','campaign','incubation_application')),
  target_id uuid not null,
  decision text not null check (decision in ('approve','reject','request_changes','mark_uncertain')),
  internal_note text,
  assessment_id uuid references public.authenticity_assessments(id),
  created_at timestamptz not null default now()
);
create index moderation_reviews_target_idx on public.moderation_reviews (target_type, target_id);

-- ---------- events ----------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.artist_profiles(id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text not null default '',
  type text not null check (type in ('workshop','masterclass','exhibition','open_studio','market','performance','commission_day')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_online boolean not null default false,
  online_url text,
  city text,
  pricing_mode text not null default 'free' check (pricing_mode in ('free','paid_pay_organizer','donation','price_on_request')),
  price_amount numeric(10,2),
  currency text not null default 'TND',
  capacity int check (capacity > 0),
  categories text[] not null default '{}',
  -- Artist events publish directly; client suggestions wait for admin approval.
  status text not null default 'published' check (status in ('pending_review','published','cancelled','rejected')),
  suggested_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index events_time_idx on public.events (status, starts_at);

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  party_size int not null default 1 check (party_size between 1 and 20),
  status text not null default 'requested' check (status in ('requested','confirmed','declined','cancelled')),
  created_at timestamptz not null default now(),
  unique (event_id, customer_id)
);

-- ---------- customer relations ----------
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  artist_id uuid references public.artist_profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((artist_id is null) <> (product_id is null))
);
create unique index favorites_artist_uq on public.favorites (customer_id, artist_id) where artist_id is not null;
create unique index favorites_product_uq on public.favorites (customer_id, product_id) where product_id is not null;

create table public.project_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  artist_id uuid not null references public.artist_profiles(id) on delete cascade,
  brief jsonb not null,
  budget_amount numeric(10,2),
  currency text not null default 'TND',
  deadline date,
  status text not null default 'submitted' check (status in ('submitted','in_discussion','accepted','declined','in_progress','completed','cancelled')),
  artist_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index project_requests_artist_idx on public.project_requests (artist_id, status);
create trigger project_requests_touch before update on public.project_requests for each row execute function touch_updated_at();

-- ---------- audit ----------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_logs_time_idx on public.audit_logs (created_at desc);
