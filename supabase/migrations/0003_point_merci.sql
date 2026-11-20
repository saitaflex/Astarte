-- POINT MERCI: an append-only points ledger. Balances are always computed, never stored.
-- Points are only created by security-definer functions after server-side checks.

create table public.artist_posts (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artist_profiles(id) on delete cascade,
  kind text not null default 'journey' check (kind in ('journey','technique','product','workshop','inspiration','upcoming')),
  title text not null check (length(title) between 3 and 140),
  body text not null check (length(body) between 40 and 6000),
  status text not null default 'published' check (status in ('draft','published','hidden')),
  reward_eligible boolean not null default true,
  created_at timestamptz not null default now()
);
create index artist_posts_artist_idx on public.artist_posts (artist_id, created_at desc);

create table public.point_activities (
  code text primary key,                 -- e.g. 'profile_discovery', 'post_read'
  title_en text not null, title_fr text not null, title_ar text not null,
  description_en text not null, description_fr text not null, description_ar text not null,
  points int not null check (points between 1 and 1000),
  min_seconds int not null default 0,    -- minimum verified engagement time
  daily_limit int not null default 5,
  active boolean not null default true
);

create table public.sponsored_campaigns (
  id uuid primary key default gen_random_uuid(),
  sponsor_name text not null,
  title text not null,
  description text not null default '',
  video_url text not null check (video_url ~ '^https://'),
  min_seconds int not null default 30 check (min_seconds between 5 and 600),
  points int not null check (points between 1 and 500),
  budget_points int not null check (budget_points > 0),
  status text not null default 'pending_review' check (status in ('pending_review','active','paused','ended','rejected')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- A server-issued session for any timed activity (video, post reading, profile discovery).
create table public.engagement_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  activity_code text not null,
  target_id uuid not null,               -- campaign, post or artist id
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index engagement_sessions_lookup on public.engagement_sessions (customer_id, activity_code, target_id);

create table public.campaign_completions (
  campaign_id uuid not null references public.sponsored_campaigns(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (campaign_id, customer_id)
);

create table public.reward_offers (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.artist_profiles(id) on delete cascade,
  business_name text,
  title text not null check (length(title) between 3 and 120),
  description text not null default '',
  conditions text not null default '',
  points_cost int not null check (points_cost between 10 and 100000),
  quantity int check (quantity >= 0),
  expires_at timestamptz,
  status text not null default 'pending_review' check (status in ('pending_review','active','paused','rejected','expired')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (artist_id is not null or business_name is not null)
);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.reward_offers(id),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  code text not null unique,
  points int not null,
  status text not null default 'issued' check (status in ('issued','used','cancelled')),
  created_at timestamptz not null default now()
);

create table public.point_transactions (
  id bigint generated always as identity primary key,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  amount int not null check (amount <> 0),
  kind text not null check (kind in ('activity','campaign','redemption','admin_adjustment','refund')),
  activity_code text references public.point_activities(code),
  campaign_id uuid references public.sponsored_campaigns(id),
  redemption_id uuid references public.reward_redemptions(id),
  ref_key text unique,                   -- idempotency: one reward per (activity, user, target)
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index point_transactions_customer_idx on public.point_transactions (customer_id, created_at desc);

create or replace view public.point_balances with (security_invoker = true) as
  select customer_id,
         coalesce(sum(amount), 0)::int as balance,
         coalesce(sum(amount) filter (where amount > 0), 0)::int as earned,
         coalesce(-sum(amount) filter (where amount < 0), 0)::int as spent
  from public.point_transactions group by customer_id;

create or replace function public.my_point_balance() returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0)::int from point_transactions where customer_id = auth.uid()
$$;

-- Step 1 of any timed activity: the server records when it started.
create or replace function public.start_engagement(p_activity text, p_target uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare sid uuid; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sign in required'; end if;
  if (select role from profiles where id = uid) <> 'customer' then raise exception 'only customers earn points'; end if;
  insert into engagement_sessions (customer_id, activity_code, target_id) values (uid, p_activity, p_target) returning id into sid;
  return sid;
end $$;

-- Step 2: award points only if the minimum time really passed on the server clock,
-- the target is eligible, the daily limit is respected and it was never rewarded before.
create or replace function public.complete_engagement(p_session uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s engagement_sessions;
  act point_activities;
  camp sponsored_campaigns;
  pts int;
  needed int;
  today_count int;
  spent_budget int;
begin
  select * into s from engagement_sessions where id = p_session and customer_id = uid for update;
  if not found then raise exception 'session not found'; end if;
  if s.completed_at is not null then return 0; end if;

  if s.activity_code = 'sponsored_video' then
    select * into camp from sponsored_campaigns where id = s.target_id;
    if not found or camp.status <> 'active' or (camp.ends_at is not null and camp.ends_at < now()) then raise exception 'campaign not active'; end if;
    needed := camp.min_seconds; pts := camp.points;
    select coalesce(sum(amount),0) into spent_budget from point_transactions where campaign_id = camp.id;
    if spent_budget + pts > camp.budget_points then raise exception 'campaign budget used up'; end if;
  else
    select * into act from point_activities where code = s.activity_code and active;
    if not found then raise exception 'activity not available'; end if;
    needed := act.min_seconds; pts := act.points;
    if s.activity_code = 'post_read' and not exists (select 1 from artist_posts where id = s.target_id and status = 'published' and reward_eligible) then
      raise exception 'post not eligible';
    end if;
    if s.activity_code = 'profile_discovery' and not exists (select 1 from artist_profiles where id = s.target_id and approval_status = 'approved') then
      raise exception 'artist not eligible';
    end if;
    select count(*) into today_count from point_transactions
      where customer_id = uid and activity_code = s.activity_code and created_at > now() - interval '1 day';
    if today_count >= act.daily_limit then raise exception 'daily limit reached'; end if;
  end if;

  if now() - s.started_at < make_interval(secs => needed) then raise exception 'not enough time spent'; end if;

  update engagement_sessions set completed_at = now() where id = s.id;
  begin
    insert into point_transactions (customer_id, amount, kind, activity_code, campaign_id, ref_key)
    values (uid, pts,
            case when s.activity_code = 'sponsored_video' then 'campaign' else 'activity' end,
            case when s.activity_code = 'sponsored_video' then null else s.activity_code end,
            case when s.activity_code = 'sponsored_video' then s.target_id else null end,
            s.activity_code || ':' || uid || ':' || s.target_id);
  exception when unique_violation then
    return 0; -- already rewarded for this target
  end;
  if s.activity_code = 'sponsored_video' then
    insert into campaign_completions (campaign_id, customer_id) values (s.target_id, uid) on conflict do nothing;
  end if;
  return pts;
end $$;

-- Atomic redemption: locks the offer and the customer's ledger so points cannot be spent twice.
create or replace function public.redeem_offer(p_offer uuid) returns public.reward_redemptions
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  off reward_offers;
  bal int;
  r reward_redemptions;
begin
  if uid is null then raise exception 'sign in required'; end if;
  perform pg_advisory_xact_lock(hashtext('points:' || uid::text));
  select * into off from reward_offers where id = p_offer for update;
  if not found or off.status <> 'active' then raise exception 'offer not available'; end if;
  if off.expires_at is not null and off.expires_at < now() then raise exception 'offer expired'; end if;
  if off.quantity is not null and off.quantity <= 0 then raise exception 'offer sold out'; end if;
  select coalesce(sum(amount),0) into bal from point_transactions where customer_id = uid;
  if bal < off.points_cost then raise exception 'not enough points'; end if;

  insert into reward_redemptions (offer_id, customer_id, code, points)
  values (off.id, uid, 'MERCI-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)), off.points_cost)
  returning * into r;
  insert into point_transactions (customer_id, amount, kind, redemption_id, note)
  values (uid, -off.points_cost, 'redemption', r.id, off.title);
  if off.quantity is not null then update reward_offers set quantity = quantity - 1 where id = off.id; end if;
  return r;
end $$;

-- Admin adjustment with a mandatory reason; logged in the ledger and the audit log.
create or replace function public.admin_adjust_points(p_customer uuid, p_amount int, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if coalesce(length(trim(p_reason)),0) < 5 then raise exception 'a reason is required'; end if;
  insert into point_transactions (customer_id, amount, kind, note, created_by) values (p_customer, p_amount, 'admin_adjustment', p_reason, auth.uid());
  insert into audit_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'points.adjust', 'profile', p_customer::text, jsonb_build_object('amount', p_amount, 'reason', p_reason));
end $$;
