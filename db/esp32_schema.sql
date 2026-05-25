create table devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  device_identifier text unique not null,
  device_secret_hash text not null,
  device_name text not null,
  current_note text default '',
  created_at timestamp default now()
);