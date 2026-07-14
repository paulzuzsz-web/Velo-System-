-- ====================================================================
-- Short Hub – Supabase-Einrichtung
-- Dieses Skript im Supabase "SQL Editor" einfügen und auf RUN klicken.
-- Es kann gefahrlos mehrfach ausgeführt werden.
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

-- Videos (die Videodatei liegt im Storage-Bucket "videos" oder direkt in src)
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

-- ====================================================================
-- OPTIONAL (bessere Video-Performance): Storage-Bucket einrichten.
-- Das geht NICHT per SQL, sondern im Dashboard:
--   1. Links "Storage" öffnen -> "New bucket" -> Name: videos
--      -> "Public bucket" AKTIVIEREN -> Save
--   2. Beim Bucket auf "Policies" -> "New policy" -> Vorlage
--      "Allow access to everyone" (bzw. alle Operationen erlauben)
-- Ohne Bucket funktioniert alles trotzdem – Videos werden dann
-- direkt in der Datenbank gespeichert.
-- ====================================================================
