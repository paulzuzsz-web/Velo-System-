/* ===================================================================
   Short Hub – Server-Anbindung (Supabase REST + Storage)
   Wird nur benutzt, wenn in config.js Zugangsdaten eingetragen sind.
   =================================================================== */

'use strict';

const REMOTE = typeof SUPABASE_URL === 'string' && /^https?:\/\//.test(SUPABASE_URL);

function sbHeaders(extra = {}) {
  return Object.assign({
    apikey: SUPABASE_ANON_KEY,
    Authorization: 'Bearer ' + SUPABASE_ANON_KEY
  }, extra);
}

async function sbJson(res) {
  if (!res.ok) throw new Error('Server-Fehler: ' + res.status);
  return res.status === 204 ? null : res.json();
}

// ---------- Benutzer ----------
function rowToUser(r) {
  return {
    password: r.password, avatar: r.avatar,
    following: r.following || [], displayName: r.display_name || r.username,
    verified: !!r.verified, ceo: !!r.ceo
  };
}
function userToRow(name, u) {
  return {
    username: name, password: u.password, avatar: u.avatar,
    following: u.following || [], display_name: u.displayName || name,
    verified: !!u.verified, ceo: !!u.ceo
  };
}

async function sbFetchUsers() {
  const rows = await sbJson(await fetch(`${SUPABASE_URL}/rest/v1/users?select=*`, { headers: sbHeaders() }));
  const users = {};
  rows.forEach(r => { users[r.username] = rowToUser(r); });
  return users;
}

async function sbUpsertUsers(users) {
  const rows = Object.entries(users).map(([n, u]) => userToRow(n, u));
  if (!rows.length) return;
  await sbJson(await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method: 'POST',
    headers: sbHeaders({ 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' }),
    body: JSON.stringify(rows)
  }));
}

async function sbDeleteUser(name) {
  await fetch(`${SUPABASE_URL}/rest/v1/users?username=eq.${encodeURIComponent(name)}`, {
    method: 'DELETE', headers: sbHeaders()
  });
}

// ---------- Videos ----------
function rowToVideo(r) {
  return {
    id: r.id, title: r.title, uploader: r.uploader, src: r.src,
    likes: r.likes || [], comments: r.comments || [],
    views: r.views || 0, ts: Number(r.ts) || 0
  };
}

async function sbFetchVideos() {
  const rows = await sbJson(await fetch(`${SUPABASE_URL}/rest/v1/videos?select=*`, { headers: sbHeaders() }));
  return rows.map(rowToVideo);
}

async function sbFetchVideo(id) {
  const rows = await sbJson(await fetch(
    `${SUPABASE_URL}/rest/v1/videos?id=eq.${encodeURIComponent(id)}&select=*`, { headers: sbHeaders() }));
  return rows[0] ? rowToVideo(rows[0]) : null;
}

async function sbInsertVideo(v) {
  await sbJson(await fetch(`${SUPABASE_URL}/rest/v1/videos`, {
    method: 'POST',
    headers: sbHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify([{
      id: v.id, title: v.title, uploader: v.uploader, src: v.src,
      likes: v.likes, comments: v.comments, views: v.views, ts: v.ts
    }])
  }));
}

async function sbPatchVideo(v) {
  await sbJson(await fetch(`${SUPABASE_URL}/rest/v1/videos?id=eq.${encodeURIComponent(v.id)}`, {
    method: 'PATCH',
    headers: sbHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      title: v.title, uploader: v.uploader,
      likes: v.likes, comments: v.comments, views: v.views
    })
  }));
}

async function sbDeleteVideoRow(id) {
  await fetch(`${SUPABASE_URL}/rest/v1/videos?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE', headers: sbHeaders()
  });
}

// ---------- Video-Dateien (Storage) ----------
async function sbUploadVideoFile(id, file) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/videos/${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: sbHeaders({ 'Content-Type': file.type || 'video/mp4', 'x-upsert': 'true' }),
    body: file
  });
  if (!res.ok) throw new Error('Upload fehlgeschlagen: ' + res.status);
  return `${SUPABASE_URL}/storage/v1/object/public/videos/${encodeURIComponent(id)}`;
}

async function sbDeleteVideoFile(id) {
  await fetch(`${SUPABASE_URL}/storage/v1/object/videos/${encodeURIComponent(id)}`, {
    method: 'DELETE', headers: sbHeaders()
  });
}
