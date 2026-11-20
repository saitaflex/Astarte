-- Row-level security, public views and Data API grants.
-- Rule: the browser only ever uses the anon key; RLS decides every row it can touch.

-- ---------- public read models (no private columns) ----------
create or replace view public.public_artists as
select
  a.id, a.slug, a.display_name, a.bio, a.primary_category, a.specialties,
  a.accepts_commissions, a.availability, a.verification_status, a.is_demo, a.created_at,
  coalesce((select array_agg(c.category_slug) from artist_categories c where c.artist_id = a.id), array[a.primary_category]) as categories,
  coalesce((select jsonb_agg(jsonb_build_object('channel', e->>'channel', 'value', e->>'value'))
            from jsonb_array_elements(a.contact) e where (e->>'public')::boolean), '[]'::jsonb) as public_contacts,
  l.city, l.region, l.country, l.privacy, l.service_radius_km,
  -- coordinates are hidden or rounded according to the artist's privacy choice
  case when l.privacy = 'hidden' then null when l.privacy = 'public_workshop' then round(l.lat::numeric, 4) else round(l.lat::numeric, 2) end::double precision as lat,
  case when l.privacy = 'hidden' then null when l.privacy = 'public_workshop' then round(l.lng::numeric, 4) else round(l.lng::numeric, 2) end::double precision as lng
from artist_profiles a
left join locations l on l.artist_id = a.id
left join profiles p on p.id = a.user_id
where a.approval_status = 'approved' and (a.user_id is null or p.status = 'active');

create or replace view public.public_images as
select id, artist_id, product_id, public_path, caption, width, height, sort, authenticity_state
from portfolio_images where moderation_status = 'approved' and public_path is not null;

-- ---------- enable RLS everywhere ----------
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- profiles
create policy profiles_self_read on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_self_update on profiles for update using (id = auth.uid() or is_admin());

-- categories & settings & activities: readable by all
create policy categories_read on categories for select using (true);
create policy categories_admin on categories for all using (is_admin()) with check (is_admin());
create policy settings_read on platform_settings for select using (true);
create policy activities_read on point_activities for select using (true);
create policy activities_admin on point_activities for all using (is_admin()) with check (is_admin());

-- artists (public reads go through public_artists)
create policy artists_own_read on artist_profiles for select using (user_id = auth.uid() or is_admin());
create policy artists_own_insert on artist_profiles for insert with check (
  user_id = auth.uid() and approval_status = 'pending' and exists (select 1 from profiles where id = auth.uid() and role = 'artist'));
create policy artists_own_update on artist_profiles for update using (user_id = auth.uid() or is_admin());

create policy artist_categories_read on artist_categories for select using (true);
create policy artist_categories_write on artist_categories for all using (artist_id = my_artist_id() or is_admin()) with check (artist_id = my_artist_id() or is_admin());

create policy locations_own on locations for all using (artist_id = my_artist_id() or is_admin()) with check (artist_id = my_artist_id() or is_admin());

-- products & services
create policy products_read on products for select using (
  (status = 'published' and exists (select 1 from artist_profiles a where a.id = artist_id and a.approval_status = 'approved'))
  or artist_id = my_artist_id() or is_admin());
create policy products_write on products for all using (artist_id = my_artist_id() or is_admin()) with check (artist_id = my_artist_id() or is_admin());
create policy product_categories_read on product_categories for select using (true);
create policy product_categories_write on product_categories for all
  using (exists (select 1 from products p where p.id = product_id and (p.artist_id = my_artist_id() or is_admin())))
  with check (exists (select 1 from products p where p.id = product_id and (p.artist_id = my_artist_id() or is_admin())));
create policy services_read on services for select using (
  (status = 'published' and exists (select 1 from artist_profiles a where a.id = artist_id and a.approval_status = 'approved'))
  or artist_id = my_artist_id() or is_admin());
create policy services_write on services for all using (artist_id = my_artist_id() or is_admin()) with check (artist_id = my_artist_id() or is_admin());
create policy service_categories_read on service_categories for select using (true);
create policy service_categories_write on service_categories for all
  using (exists (select 1 from services s where s.id = service_id and (s.artist_id = my_artist_id() or is_admin())))
  with check (exists (select 1 from services s where s.id = service_id and (s.artist_id = my_artist_id() or is_admin())));

-- images: rows are created by the server after validation; artists can read and delete their own
create policy images_own_read on portfolio_images for select using (artist_id = my_artist_id() or is_admin());
create policy images_own_delete on portfolio_images for delete using (artist_id = my_artist_id() or is_admin());
create policy images_admin_update on portfolio_images for update using (is_admin());
create policy assessments_read on authenticity_assessments for select using (
  is_admin() or exists (select 1 from portfolio_images i where i.id = image_id and i.artist_id = my_artist_id()));
create policy reviews_admin on moderation_reviews for all using (is_admin()) with check (is_admin());
create policy audit_admin_read on audit_logs for select using (is_admin());

-- events
create policy events_read on events for select using (status = 'published' or artist_id = my_artist_id() or suggested_by = auth.uid() or is_admin());
create policy events_artist_insert on events for insert with check (
  (artist_id = my_artist_id() and status = 'published' and suggested_by is null)
  or (suggested_by = auth.uid() and status = 'pending_review'));
create policy events_update on events for update using (artist_id = my_artist_id() or is_admin());
create policy events_delete on events for delete using (artist_id = my_artist_id() or is_admin());
create policy event_regs_read on event_registrations for select using (
  customer_id = auth.uid() or is_admin() or exists (select 1 from events e where e.id = event_id and e.artist_id = my_artist_id()));
create policy event_regs_insert on event_registrations for insert with check (customer_id = auth.uid() and status = 'requested');
create policy event_regs_update on event_registrations for update using (
  customer_id = auth.uid() or is_admin() or exists (select 1 from events e where e.id = event_id and e.artist_id = my_artist_id()));

-- favourites, requests, cart
create policy favorites_own on favorites for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy requests_read on project_requests for select using (customer_id = auth.uid() or artist_id = my_artist_id() or is_admin());
create policy requests_insert on project_requests for insert with check (customer_id = auth.uid() and status = 'submitted');
create policy requests_update on project_requests for update using (customer_id = auth.uid() or artist_id = my_artist_id() or is_admin());
create policy cart_own on shopping_cart_items for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- orders: read only; all changes go through place_order / update_order_status
create policy orders_read on marketplace_orders for select using (customer_id = auth.uid() or artist_id = my_artist_id() or is_admin());
create policy order_items_read on order_items for select using (
  exists (select 1 from marketplace_orders o where o.id = order_id and (o.customer_id = auth.uid() or o.artist_id = my_artist_id() or is_admin())));

-- Point Merci
create policy posts_read on artist_posts for select using (
  (status = 'published' and exists (select 1 from artist_profiles a where a.id = artist_id and a.approval_status = 'approved'))
  or artist_id = my_artist_id() or is_admin());
create policy posts_write on artist_posts for all using (artist_id = my_artist_id() or is_admin()) with check (artist_id = my_artist_id() or is_admin());
create policy campaigns_read on sponsored_campaigns for select using (status = 'active' or is_admin());
create policy campaigns_admin on sponsored_campaigns for all using (is_admin()) with check (is_admin());
create policy sessions_own on engagement_sessions for select using (customer_id = auth.uid());
create policy completions_own on campaign_completions for select using (customer_id = auth.uid() or is_admin());
create policy offers_read on reward_offers for select using (status = 'active' or artist_id = my_artist_id() or is_admin());
create policy offers_artist_insert on reward_offers for insert with check (artist_id = my_artist_id() and status = 'pending_review');
create policy offers_update on reward_offers for update using (is_admin() or (artist_id = my_artist_id() and status = 'pending_review'));
create policy redemptions_read on reward_redemptions for select using (
  customer_id = auth.uid() or is_admin() or exists (select 1 from reward_offers o where o.id = offer_id and o.artist_id = my_artist_id()));
create policy points_read on point_transactions for select using (customer_id = auth.uid() or is_admin());

-- Incubation
create policy programs_read on incubation_programs for select using (active or is_admin());
create policy programs_admin on incubation_programs for all using (is_admin()) with check (is_admin());
create policy milestones_read on incubation_milestones for select using (true);
create policy milestones_admin on incubation_milestones for all using (is_admin()) with check (is_admin());
create policy applications_read on incubation_applications for select using (artist_id = my_artist_id() or is_admin());
create policy applications_insert on incubation_applications for insert with check (artist_id = my_artist_id() and status = 'submitted');
create policy enrollments_read on incubation_enrollments for select using (artist_id = my_artist_id() or is_admin());
create policy enrollments_admin on incubation_enrollments for all using (is_admin()) with check (is_admin());
create policy milestone_done_own on milestone_completions for all
  using (exists (select 1 from incubation_enrollments e where e.id = enrollment_id and (e.artist_id = my_artist_id() or is_admin())))
  with check (exists (select 1 from incubation_enrollments e where e.id = enrollment_id and e.artist_id = my_artist_id()));
create policy resources_read on learning_resources for select using (published or is_admin());
create policy resources_admin on learning_resources for all using (is_admin()) with check (is_admin());
create policy workshops_read on workshops for select using (true);
create policy workshops_admin on workshops for all using (is_admin()) with check (is_admin());
create policy workshop_regs_own on workshop_registrations for all using (artist_id = my_artist_id() or is_admin()) with check (artist_id = my_artist_id());

-- ---------- grants (explicit, required for the Data API on new projects) ----------
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
revoke insert, update, delete on public.marketplace_orders, public.order_items, public.point_transactions,
  public.reward_redemptions, public.campaign_completions, public.engagement_sessions, public.audit_logs from authenticated;
grant select on public.public_artists, public.public_images to anon, authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
revoke execute on all functions in schema public from anon;
grant execute on function public.is_admin(), public.my_artist_id() to anon;
