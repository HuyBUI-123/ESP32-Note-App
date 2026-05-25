create table devices (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references auth.users(id) on delete cascade,

  device_name text not null,

  device_identifier text unique not null,

  device_secret_hash text not null,

  current_note text default '',

  updated_at timestamp default now()
);