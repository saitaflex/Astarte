-- GROW WITH ARTSART: incubation programme, journey, resources and workshops.

create table public.incubation_programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.incubation_milestones (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.incubation_programs(id) on delete cascade,
  stage int not null check (stage between 1 and 5),
  sort int not null default 0,
  title text not null,
  description text not null default '',
  -- 'manual' = artist ticks it; other values are checked automatically from real data
  check_kind text not null default 'manual' check (check_kind in ('manual','has_bio','has_location','has_3_products','has_priced_products','has_approved_images','has_post','has_order'))
);
create index incubation_milestones_program_idx on public.incubation_milestones (program_id, stage, sort);

create table public.incubation_applications (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artist_profiles(id) on delete cascade,
  program_id uuid not null references public.incubation_programs(id),
  motivation text not null check (length(motivation) between 30 and 3000),
  needs text[] not null default '{}',
  status text not null default 'submitted' check (status in ('submitted','accepted','rejected')),
  reviewer_id uuid references public.profiles(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (artist_id, program_id)
);

create table public.incubation_enrollments (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artist_profiles(id) on delete cascade,
  program_id uuid not null references public.incubation_programs(id),
  mentor_name text,
  started_at timestamptz not null default now(),
  unique (artist_id, program_id)
);

create table public.milestone_completions (
  enrollment_id uuid references public.incubation_enrollments(id) on delete cascade,
  milestone_id uuid references public.incubation_milestones(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (enrollment_id, milestone_id)
);

create table public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  stage int not null check (stage between 1 and 5),
  kind text not null default 'guide' check (kind in ('guide','checklist','video','template')),
  title text not null,
  summary text not null,
  body text not null default '',
  url text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.workshops (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  host text not null,
  topic text not null check (topic in ('marketing','photography','pricing','entrepreneurship','networking','craft')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_online boolean not null default true,
  city text,
  capacity int check (capacity > 0),
  status text not null default 'scheduled' check (status in ('scheduled','cancelled','done')),
  created_at timestamptz not null default now()
);

create table public.workshop_registrations (
  workshop_id uuid references public.workshops(id) on delete cascade,
  artist_id uuid references public.artist_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (workshop_id, artist_id)
);

-- Accepting an application enrols the artist in one transaction.
create or replace function public.decide_incubation_application(p_application uuid, p_accept boolean, p_mentor text default null) returns void
language plpgsql security definer set search_path = public as $$
declare a incubation_applications;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  select * into a from incubation_applications where id = p_application for update;
  if not found or a.status <> 'submitted' then raise exception 'application not pending'; end if;
  update incubation_applications set status = case when p_accept then 'accepted' else 'rejected' end, reviewer_id = auth.uid(), decided_at = now() where id = a.id;
  if p_accept then
    insert into incubation_enrollments (artist_id, program_id, mentor_name) values (a.artist_id, a.program_id, nullif(p_mentor,'')) on conflict do nothing;
  end if;
  insert into audit_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), case when p_accept then 'incubation.accept' else 'incubation.reject' end, 'incubation_application', a.id::text, jsonb_build_object('mentor', p_mentor));
end $$;
