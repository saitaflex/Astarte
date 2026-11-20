-- Public read policies must not depend on tables anonymous users cannot read.
create or replace function public.is_artist_approved(p_artist uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from artist_profiles where id = p_artist and approval_status = 'approved')
$$;

drop policy products_read on products;
create policy products_read on products for select using ((status = 'published' and is_artist_approved(artist_id)) or artist_id = my_artist_id() or is_admin());
drop policy services_read on services;
create policy services_read on services for select using ((status = 'published' and is_artist_approved(artist_id)) or artist_id = my_artist_id() or is_admin());
drop policy posts_read on artist_posts;
create policy posts_read on artist_posts for select using ((status = 'published' and is_artist_approved(artist_id)) or artist_id = my_artist_id() or is_admin());

-- Functions are executable by PUBLIC by default in Postgres; lock them to signed-in users.
revoke execute on all functions in schema public from public;
grant execute on all functions in schema public to authenticated, service_role;
grant execute on function public.is_admin(), public.my_artist_id(), public.is_artist_approved(uuid) to anon;
alter default privileges in schema public revoke execute on functions from public;
