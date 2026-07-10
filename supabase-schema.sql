-- Run this in Supabase: SQL Editor > New query > paste > Run
-- https://supabase.com/dashboard/project/nzlnollwpzzgvpyrpcpa/sql/new

create table if not exists public.water_readings (
  id          bigint generated always as identity primary key,
  feedlot_id  text not null,
  gateway_id  text not null,
  sender_id   smallint not null,
  sender_name text not null,
  ts          timestamptz not null,          -- timestamp from the device
  flow_rate   real not null,                 -- L/min
  volume      real not null,                 -- L
  rssi        smallint,
  snr         real,
  created_at  timestamptz not null default now()
);

create index if not exists water_readings_ts_idx
  on public.water_readings (feedlot_id, sender_id, ts desc);

-- Lock the table down. The Worker uses the service_role key which bypasses RLS,
-- so no public policies are needed.
alter table public.water_readings enable row level security;
