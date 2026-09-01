alter table public.worker_profiles
  add column if not exists is_featured boolean not null default false;

comment on column public.worker_profiles.is_featured is 'Whether the worker is featured in high-priority search results';
