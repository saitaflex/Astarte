-- Recommendation engine: multilingual content embeddings (pgvector), anonymous interaction log, search log.
-- Embeddings: 384-dim vectors from paraphrase-multilingual-MiniLM-L12-v2 (FR, EN, AR), L2-normalised,
-- written by scripts/embed-catalog.mjs. Interactions are anonymous (random visitor id, no personal data).

create extension if not exists vector with schema extensions;

alter table public.products add column if not exists embedding extensions.vector(384);
alter table public.artist_profiles add column if not exists embedding extensions.vector(384);

create table if not exists public.interactions (
  id bigint generated always as identity primary key,
  visitor_id text not null check (length(visitor_id) between 8 and 64),
  kind text not null check (kind in ('view_product', 'view_artist', 'contact_click', 'recommendation_click', 'passport_scan')),
  product_id uuid references public.products(id) on delete cascade,
  artist_id uuid references public.artist_profiles(id) on delete cascade,
  source text check (length(source) <= 40),
  created_at timestamptz not null default now()
);
create index if not exists interactions_visitor_idx on public.interactions (visitor_id, created_at desc);
create index if not exists interactions_product_idx on public.interactions (product_id);
create index if not exists interactions_artist_idx on public.interactions (artist_id);
alter table public.interactions enable row level security;   -- written and read by the server only (service role)

create table if not exists public.search_events (
  id bigint generated always as identity primary key,
  query text not null check (length(query) <= 300),
  locale text,
  artist_ids uuid[] not null default '{}',
  product_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists search_events_artists_idx on public.search_events using gin (artist_ids);
alter table public.search_events enable row level security;

-- Nearest products by cosine similarity among published products of approved artists.
create or replace function public.similar_products(p_id uuid, k int default 12)
returns table (id uuid, similarity float)
language sql stable security definer set search_path = public, extensions as $$
  select p.id, 1 - (p.embedding <=> q.embedding) as similarity
  from products p
  join artist_profiles a on a.id = p.artist_id and a.approval_status = 'approved'
  cross join (select embedding from products where id = p_id) q
  where p.id <> p_id and p.status = 'published' and p.embedding is not null and q.embedding is not null
  order by p.embedding <=> q.embedding
  limit k;
$$;

create or replace function public.similar_artists(a_id uuid, k int default 12)
returns table (id uuid, similarity float)
language sql stable security definer set search_path = public, extensions as $$
  select a.id, 1 - (a.embedding <=> q.embedding) as similarity
  from artist_profiles a
  cross join (select embedding from artist_profiles where id = a_id) q
  where a.id <> a_id and a.approval_status = 'approved' and a.embedding is not null and q.embedding is not null
  order by a.embedding <=> q.embedding
  limit k;
$$;

-- Products closest to a visitor's taste vector (mean of the embeddings of what they viewed).
create or replace function public.products_near(v extensions.vector(384), k int default 24)
returns table (id uuid, similarity float)
language sql stable security definer set search_path = public, extensions as $$
  select p.id, 1 - (p.embedding <=> v) as similarity
  from products p
  join artist_profiles a on a.id = p.artist_id and a.approval_status = 'approved'
  where p.status = 'published' and p.embedding is not null
  order by p.embedding <=> v
  limit k;
$$;

revoke execute on function public.similar_products(uuid, int) from public, anon, authenticated;
revoke execute on function public.similar_artists(uuid, int) from public, anon, authenticated;
revoke execute on function public.products_near(extensions.vector, int) from public, anon, authenticated;
