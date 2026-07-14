-- ====================================================================
-- Short Hub – Supabase-Einrichtung
-- Dieses Skript im Supabase "SQL Editor" einfügen und auf RUN klicken.
-- ====================================================================

-- Konten
create table if not exists users (
  username text primary key,
  password text,
  display_name text,
  avatar text,
  following jsonb default '[]'::jsonb,
  verified boolean default false,
  ceo boolean default false
);

-- Videos (die Videodatei selbst liegt im Storage-Bucket "videos")
create table if not exists videos (
  id text primary key,
  title text,
  uploader text,
  src text,
  likes jsonb default '[]'::jsonb,
  comments jsonb default '[]'::jsonb,
  views integer default 0,
  ts bigint
);

-- Öffentlicher Zugriff (Demo-App ohne eigenes Login-System auf dem Server)
alter table users enable row level security;
alter table videos enable row level security;
drop policy if exists "shorthub users" on users;
drop policy if exists "shorthub videos" on videos;
create policy "shorthub users" on users for all using (true) with check (true);
create policy "shorthub videos" on videos for all using (true) with check (true);

-- Speicher-Bucket für die Videodateien (öffentlich lesbar)
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do update set public = true;

drop policy if exists "shorthub storage" on storage.objects;
create policy "shorthub storage" on storage.objects
  for all using (bucket_id = 'videos') with check (bucket_id = 'videos');
