-- ====================================================================
-- Short Hub – ALLE Daten löschen (Videos + Profile + Videodateien)
-- Dieses Skript im Supabase "SQL Editor" ausführen, um komplett
-- frisch zu starten. ACHTUNG: Kann nicht rückgängig gemacht werden!
-- ====================================================================

delete from videos;
delete from users;
delete from storage.objects where bucket_id = 'videos';
