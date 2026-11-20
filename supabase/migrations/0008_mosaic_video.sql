-- Mosaic as its own discipline, and one optional featured video per artist profile.
insert into public.categories (slug, name_en, name_fr, name_ar, atmosphere, sort)
values ('mosaic', 'Mosaic', 'Mosaïque', 'الفسيفساء', 'clay', 5)
on conflict (slug) do nothing;

alter table public.artist_profiles add column if not exists featured_video_path text;

-- Recreate the public view with the new column appended (existing columns unchanged).
create or replace view public.public_artists as
select
  a.id, a.slug, a.display_name, a.bio, a.primary_category, a.specialties,
  a.accepts_commissions, a.availability, a.verification_status, a.is_demo, a.created_at,
  coalesce((select array_agg(c.category_slug) from artist_categories c where c.artist_id = a.id), array[a.primary_category]) as categories,
  coalesce((select jsonb_agg(jsonb_build_object('channel', e->>'channel', 'value', e->>'value'))
            from jsonb_array_elements(a.contact) e where (e->>'public')::boolean), '[]'::jsonb) as public_contacts,
  l.city, l.region, l.country, l.privacy, l.service_radius_km,
  case when l.privacy = 'hidden' then null when l.privacy = 'public_workshop' then round(l.lat::numeric, 4) else round(l.lat::numeric, 2) end::double precision as lat,
  case when l.privacy = 'hidden' then null when l.privacy = 'public_workshop' then round(l.lng::numeric, 4) else round(l.lng::numeric, 2) end::double precision as lng,
  a.featured_video_path
from artist_profiles a
left join locations l on l.artist_id = a.id
left join profiles p on p.id = a.user_id
where a.approval_status = 'approved' and (a.user_id is null or p.status = 'active');

grant select on public.public_artists to anon, authenticated;
