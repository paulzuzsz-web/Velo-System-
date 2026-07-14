/* ===================================================================
   Short Hub – Server-Konfiguration (Supabase)

   Damit Videos für ALLE Nutzer auf ALLEN Geräten sichtbar sind,
   trage hier die Zugangsdaten deines kostenlosen Supabase-Projekts
   ein (Anleitung: siehe README.md).

   Bleiben die Felder leer, läuft die App im lokalen Modus –
   alles funktioniert, aber nur im eigenen Browser.
   =================================================================== */

'use strict';

let SUPABASE_URL = 'HIER_DEINE_SUPABASE_URL';      // z. B. 'https://abcdefgh.supabase.co'
let SUPABASE_ANON_KEY = 'HIER_DEIN_ANON_KEY';      // der lange "anon public" Schlüssel

// Platzhalter noch nicht ersetzt? Dann lokaler Modus.
if (!/^https?:\/\//.test(SUPABASE_URL)) { SUPABASE_URL = ''; SUPABASE_ANON_KEY = ''; }

// Für Tests/Entwicklung überschreibbar, ohne die Datei zu ändern:
if (localStorage.getItem('sh_supabase_url')) {
  SUPABASE_URL = localStorage.getItem('sh_supabase_url');
  SUPABASE_ANON_KEY = localStorage.getItem('sh_supabase_key') || '';
}
