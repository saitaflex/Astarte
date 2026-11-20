-- Passeport Savoir-faire: transparent, artisan-declared facts about how and where a work is made.
-- Every field is optional; the public page shows "not provided" rather than guessing.
alter table public.products add column if not exists technique text check (length(technique) <= 300);
alter table public.products add column if not exists origin_city text check (length(origin_city) <= 80);
alter table public.products add column if not exists hours_to_make numeric(6,1) check (hours_to_make > 0);
alter table public.products add column if not exists local_materials boolean;      -- materials sourced in Tunisia
alter table public.products add column if not exists recycled_materials boolean;   -- reused / recycled materials
alter table public.products add column if not exists repairable boolean;           -- artisan offers repair
alter table public.products add column if not exists care_instructions text check (length(care_instructions) <= 500);
alter table public.products add column if not exists passport_scans int not null default 0;
