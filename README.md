# 🎬 Short Hub

Eine Social-Media-Website im Stil von TikTok – als statische Web-App, bereit für Netlify.

## Funktionen

- **Anmelden / Registrieren** mit Benutzername und Passwort
- **Profil** mit Benutzernamen und Profilbild (änderbar)
- **Kurze Videos hochladen** (maximal 1 Minute) mit Pflicht-Videonamen
- **Shorts-Feed**: zufällige Videos aller Nutzer, vertikal scrollbar mit Autoplay
- **Liken** ❤️ und **Kommentieren** 💬 von Videos
- **Folgen** von Nutzern – Follower und Gefolgt werden im Profil angezeigt (wie bei TikTok)
- **Suche** nach Videonamen oder Nutzern
- Eigene Videos können im Profil gelöscht werden

## Auf Netlify veröffentlichen

1. Gehe zu [app.netlify.com](https://app.netlify.com)
2. Ziehe diesen Projektordner per Drag & Drop auf „Sites" (oder verbinde das GitHub-Repo)
3. Fertig – keine Build-Einstellungen nötig, es ist eine rein statische Seite.

## 🌍 Videos für ALLE sichtbar machen (Supabase einrichten – kostenlos, 5 Minuten)

Damit hochgeladene Videos **auf jedem Gerät für jeden Nutzer** sichtbar sind
(auch wenn der Ersteller offline oder abgemeldet ist), braucht die Seite einen
Online-Speicher. Das geht kostenlos mit **Supabase** (keine Kreditkarte nötig):

1. Auf [supabase.com](https://supabase.com) ein kostenloses Konto erstellen
2. **New project** anlegen (Name egal, z. B. „shorthub“; Datenbank-Passwort merken)
3. Links **SQL Editor** öffnen → den kompletten Inhalt der Datei
   [`supabase-setup.sql`](supabase-setup.sql) hineinkopieren → **Run** klicken
4. Links **Project Settings → API** öffnen und zwei Werte kopieren:
   - **Project URL** (z. B. `https://abcdefgh.supabase.co`)
   - **anon public** API-Key (der lange Schlüssel)
5. In der Datei **`config.js`** die beiden Platzhalter durch diese Werte ersetzen
6. Seite neu auf Netlify hochladen – fertig! 🎉

Ab dann gilt:
- 📤 Hochgeladene Videos liegen **auf dem Server** und sind für alle sichtbar –
  auf jedem Gerät, bis sie gelöscht werden
- 👤 **Alle Konten** sind für alle sichtbar und über die Suche zu finden
- ❤️ Likes, Kommentare, Aufrufe und Follower werden geteilt

**Ohne** eingetragene Zugangsdaten – oder wenn der Server nicht erreichbar/
eingerichtet ist – läuft die App automatisch im lokalen Modus: alles
funktioniert, aber nur im eigenen Browser.

### Alle Daten löschen (frisch anfangen)

- **Server-Daten** (alle Videos + Profile für alle): Datei
  [`supabase-reset.sql`](supabase-reset.sql) im Supabase **SQL Editor**
  ausführen.
- **Lokale Daten** (nur dieses Gerät): die Seite einmal mit `?reset=1`
  öffnen, z. B. `https://deine-seite.netlify.app/?reset=1`.

> Hinweis: Diese Demo-Konfiguration erlaubt jedem Besucher Lese- und
> Schreibzugriff auf die Daten – für ein Hobby-Projekt okay, für eine echte
> öffentliche App sollte später Supabase Auth mit strengeren Regeln ergänzt werden.

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | Struktur der App (Login, Feed, Suche, Upload, Profil) |
| `styles.css` | Dunkles TikTok-ähnliches Design |
| `app.js` | Gesamte Logik (Konten, Videos, Likes, Kommentare, Follows) |
| `config.js` | Supabase-Zugangsdaten (für geräteübergreifendes Teilen) |
| `backend.js` | Server-Anbindung (Supabase REST + Storage) |
| `supabase-setup.sql` | Einrichtungs-Skript für den Supabase SQL Editor |
| `netlify.toml` | Netlify-Konfiguration |
| `logo.png` | Short-Hub-Logo (Login-Screen) |
| `logo-icon.png` | Logo-Icon (Kopfzeile + Favicon) |
