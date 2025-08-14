-- Create initial tables if they don't exist
CREATE TABLE IF NOT EXISTS users (
  id integer primary key,
  email text not null unique,
  password text not null,
  role text not null default 'MEMBER',
  app_currency_balance integer not null default 0
);

CREATE TABLE IF NOT EXISTS vehicles (
  id integer primary key,
  make text not null,
  model text not null,
  year integer not null,
  battery_capacity integer,
  range integer,
  charging_speed integer
);

CREATE TABLE IF NOT EXISTS contributions (
  id integer primary key,
  user_id integer not null references users(id),
  vehicle_data text not null,
  status text not null default 'PENDING',
  created_at integer not null,
  approved_at integer,
  rejected_at integer
);

CREATE TABLE IF NOT EXISTS contribution_reviews (
  id integer primary key,
  contribution_id integer not null references contributions(id),
  user_id integer not null references users(id),
  vote integer not null
);

CREATE TABLE IF NOT EXISTS api_keys (
  id integer primary key,
  user_id integer not null references users(id),
  key text not null unique,
  name text,
  expires_at integer,
  created_at integer not null,
  revoked_at integer
);

CREATE TABLE IF NOT EXISTS api_usage (
  id integer primary key,
  api_key_id integer not null references api_keys(id),
  used_at integer not null,
  path text not null,
  method text not null
);
