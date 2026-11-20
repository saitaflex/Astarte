-- AI-written descriptions of what each photo shows, so search can match the right artist
-- and the right picture. Descriptions describe; they never claim how a work was made.
alter table public.portfolio_images add column if not exists ai_description text;
alter table public.portfolio_images add column if not exists tags text[] not null default '{}';
alter table public.portfolio_images add column if not exists described_by text;

create or replace view public.public_images as
select id, artist_id, product_id, public_path, caption, width, height, sort, authenticity_state, ai_description, tags
from portfolio_images where moderation_status = 'approved' and public_path is not null;

grant select on public.public_images to anon, authenticated;
