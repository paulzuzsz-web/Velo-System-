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

## Wichtiger Hinweis zur Datenspeicherung

Netlify hostet nur statische Dateien – es gibt **keinen Server und keine Datenbank**.
Deshalb werden alle Daten (Konten, Videos, Likes, Kommentare, Follower) **lokal im
Browser** gespeichert (IndexedDB und localStorage):

- Alles funktioniert vollständig auf einem Gerät/Browser (auch mit mehreren Konten).
- Nutzer auf **anderen Geräten** sehen die Videos jedoch **nicht**, da es keinen
  gemeinsamen Server gibt.

Für echtes geräteübergreifendes Teilen kann später ein Backend-Dienst wie
**Firebase** oder **Supabase** angebunden werden – die App ist dafür vorbereitet
(alle Datenzugriffe sind in `app.js` in eigenen Funktionen gekapselt).

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | Struktur der App (Login, Feed, Suche, Upload, Profil) |
| `styles.css` | Dunkles TikTok-ähnliches Design |
| `app.js` | Gesamte Logik (Konten, Videos, Likes, Kommentare, Follows) |
| `netlify.toml` | Netlify-Konfiguration |
| `logo.png` | Short-Hub-Logo (Login-Screen) |
| `logo-icon.png` | Logo-Icon (Kopfzeile + Favicon) |
