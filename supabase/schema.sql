create table public.visitor_locations (
  id bigint generated always as identity primary key,
  latitude double precision not null
    constraint visitor_locations_latitude_range check (latitude between -90 and 90),
  longitude double precision not null
    constraint visitor_locations_longitude_range check (longitude between -180 and 180),
  country_code text
    constraint visitor_locations_country_code_format
    check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  city text
    constraint visitor_locations_city_length
    check (city is null or char_length(city) <= 120),
  visitor_hash text not null
    constraint visitor_locations_hash_format
    check (visitor_hash ~ '^[0-9a-f]{64}$'),
  visit_date date not null default (timezone('utc', now()))::date,
  visited_at timestamptz not null default now(),
  constraint visitor_locations_one_per_visitor_day unique (visitor_hash, visit_date)
);

comment on table public.visitor_locations is
  'Permanent, privacy-preserving approximate visitor locations for the public homepage globe. Raw IP addresses are never stored.';

alter table public.visitor_locations enable row level security;

revoke all on table public.visitor_locations from public, anon, authenticated;
revoke all on sequence public.visitor_locations_id_seq from public, anon, authenticated;

grant select, insert on table public.visitor_locations to service_role;
grant usage, select on sequence public.visitor_locations_id_seq to service_role;

create index visitor_locations_visited_at_idx
  on public.visitor_locations (visited_at desc);
