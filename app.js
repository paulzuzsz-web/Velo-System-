/* ===================================================================
   Short Hub – TikTok-ähnliche Social-Media-App
   Speicherung: Konten/Follows in localStorage, Videos in IndexedDB.
   Hinweis: Auf Netlify (statisches Hosting) sind alle Daten lokal
   im Browser des jeweiligen Nutzers gespeichert.
   =================================================================== */

'use strict';

// ---------------- IndexedDB (Videos) ----------------
const DB_NAME = 'shorthub';
const DB_VERSION = 1;
let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains('videos')) {
        d.createObjectStore('videos', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

function dbGetAllVideos() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('videos', 'readonly');
    const req = tx.objectStore('videos').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function dbPutVideo(video) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('videos', 'readwrite');
    tx.objectStore('videos').put(video);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function dbDeleteVideo(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('videos', 'readwrite');
    tx.objectStore('videos').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------------- Benutzer (localStorage) ----------------
function getUsers() {
  try { return JSON.parse(localStorage.getItem('sh_users')) || {}; }
  catch { return {}; }
}
function saveUsers(users) {
  localStorage.setItem('sh_users', JSON.stringify(users));
}
function currentUser() {
  return localStorage.getItem('sh_session');
}
function setSession(username) {
  if (username) localStorage.setItem('sh_session', username);
  else localStorage.removeItem('sh_session');
}

// Einfacher Passwort-Hash (Demo – kein echter Schutz auf statischem Hosting)
async function hashPassword(password) {
  const data = new TextEncoder().encode('shorthub:' + password);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
       <rect width="96" height="96" fill="#2a2a2a"/>
       <circle cx="48" cy="38" r="16" fill="#777"/>
       <ellipse cx="48" cy="78" rx="26" ry="18" fill="#777"/>
     </svg>`);

function avatarOf(username) {
  const u = getUsers()[username];
  return (u && u.avatar) || DEFAULT_AVATAR;
}

function followersOf(username) {
  const users = getUsers();
  return Object.keys(users).filter(name => (users[name].following || []).includes(username));
}

function isFollowing(target) {
  const me = getUsers()[currentUser()];
  return !!me && (me.following || []).includes(target);
}

function toggleFollow(target) {
  const users = getUsers();
  const me = users[currentUser()];
  if (!me || target === currentUser()) return;
  me.following = me.following || [];
  const i = me.following.indexOf(target);
  if (i >= 0) me.following.splice(i, 1);
  else me.following.push(target);
  saveUsers(users);
}

// ---------------- DOM-Kürzel ----------------
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

// ---------------- SVG-Icons ----------------
const ICONS = {
  heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.2c-.4 0-.7-.1-1-.4C7.5 17.8 2.5 14 2.5 9.4 2.5 6.4 4.9 4 7.9 4c1.6 0 3.1.7 4.1 1.9C13 4.7 14.5 4 16.1 4c3 0 5.4 2.4 5.4 5.4 0 4.6-5 8.4-8.5 11.4-.3.3-.6.4-1 .4z"/></svg>',
  comment: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5c-5.5 0-10 3.9-10 8.8 0 2.6 1.3 5 3.4 6.6-.2 1-.8 2.4-2 3.3-.3.2-.1.7.2.7 2.4 0 4.2-1.1 5.2-1.9 1 .3 2.1.5 3.2.5 5.5 0 10-3.9 10-8.8s-4.5-9.2-10-9.2z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2"/></svg>',
  pencil: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 17.3V20h2.7L17.8 8.9l-2.7-2.7L4 17.3zM20.7 6c.4-.4.4-1 0-1.4l-1.3-1.3c-.4-.4-1-.4-1.4 0l-1.5 1.5 2.7 2.7L20.7 6z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>'
};

// ---------------- Auth-Screen ----------------
let authMode = 'login';

function setAuthMode(mode) {
  authMode = mode;
  $('#tab-login').classList.toggle('active', mode === 'login');
  $('#tab-register').classList.toggle('active', mode === 'register');
  $('#auth-submit').textContent = mode === 'login' ? 'Anmelden' : 'Registrieren';
  $('#auth-error').textContent = '';
}

$('#tab-login').addEventListener('click', () => setAuthMode('login'));
$('#tab-register').addEventListener('click', () => setAuthMode('register'));

$('#auth-form').addEventListener('submit', async e => {
  e.preventDefault();
  const username = $('#auth-username').value.trim();
  const password = $('#auth-password').value;
  const errEl = $('#auth-error');
  errEl.textContent = '';

  if (!/^[\wäöüÄÖÜß.-]{3,24}$/.test(username)) {
    errEl.textContent = 'Benutzername: 3–24 Zeichen (Buchstaben, Zahlen, . _ -).';
    return;
  }

  const users = getUsers();
  const hash = await hashPassword(password);

  if (authMode === 'register') {
    if (users[username]) {
      errEl.textContent = 'Dieser Benutzername ist bereits vergeben.';
      return;
    }
    users[username] = { password: hash, avatar: null, following: [] };
    saveUsers(users);
  } else {
    if (!users[username] || users[username].password !== hash) {
      errEl.textContent = 'Benutzername oder Passwort ist falsch.';
      return;
    }
  }

  setSession(username);
  enterApp();
});

function enterApp() {
  $('#auth-screen').classList.add('hidden');
  $('#app').classList.remove('hidden');
  showPage('feed');
}

function logout() {
  setSession(null);
  location.reload();
}

// ---------------- Navigation ----------------
let profileViewUser = null; // welches Profil gerade angezeigt wird

function showPage(name) {
  $$('.page').forEach(p => p.classList.remove('active'));
  $('#page-' + name).classList.add('active');
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === name));
  pauseAllVideos();
  if (name === 'feed') renderFeed();
  if (name === 'profile') renderProfile(profileViewUser || currentUser());
  if (name === 'search') renderSearch($('#search-input').value);
}

$$('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.page === 'profile') profileViewUser = null; // eigenes Profil
    showPage(btn.dataset.page);
  });
});

function pauseAllVideos() {
  $$('video').forEach(v => v.pause());
}

// ---------------- Feed (Shorts) ----------------
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let feedObserver = null;

async function renderFeed() {
  const container = $('#feed-container');
  container.innerHTML = '';
  const videos = shuffle(await dbGetAllVideos());
  $('#feed-empty').classList.toggle('hidden', videos.length > 0);

  if (feedObserver) feedObserver.disconnect();
  feedObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const vid = entry.target.querySelector('video');
      if (!vid) return;
      if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
        vid.play().catch(() => {});
      } else {
        vid.pause();
      }
    });
  }, { threshold: [0, 0.6, 1] });

  videos.forEach(video => {
    const el = buildShort(video);
    container.appendChild(el);
    feedObserver.observe(el);
  });
}

function buildShort(video) {
  const me = currentUser();
  const liked = video.likes.includes(me);
  const el = document.createElement('div');
  el.className = 'short';
  el.dataset.id = video.id;

  const vid = document.createElement('video');
  vid.src = URL.createObjectURL(video.blob);
  vid.loop = true;
  vid.playsInline = true;
  vid.addEventListener('click', () => vid.paused ? vid.play() : vid.pause());
  el.appendChild(vid);

  // Info unten links
  const info = document.createElement('div');
  info.className = 'short-info';
  const uploaderRow = document.createElement('div');
  uploaderRow.className = 'uploader';
  const av = document.createElement('img');
  av.src = avatarOf(video.uploader);
  const name = document.createElement('span');
  name.textContent = '@' + video.uploader;
  uploaderRow.append(av, name);
  uploaderRow.addEventListener('click', () => {
    profileViewUser = video.uploader;
    showPage('profile');
  });

  if (video.uploader !== me) {
    const followBtn = document.createElement('button');
    followBtn.className = 'follow-chip' + (isFollowing(video.uploader) ? ' following' : '');
    followBtn.textContent = isFollowing(video.uploader) ? 'Gefolgt ✓' : 'Folgen';
    followBtn.addEventListener('click', e => {
      e.stopPropagation();
      toggleFollow(video.uploader);
      followBtn.classList.toggle('following', isFollowing(video.uploader));
      followBtn.textContent = isFollowing(video.uploader) ? 'Gefolgt ✓' : 'Folgen';
    });
    uploaderRow.appendChild(followBtn);
  }

  const title = document.createElement('div');
  title.className = 'video-title';
  title.textContent = video.title;
  info.append(uploaderRow, title);
  el.appendChild(info);

  // Aktionen rechts
  const actions = document.createElement('div');
  actions.className = 'short-actions';

  const likeBtn = document.createElement('button');
  likeBtn.className = 'action-btn' + (liked ? ' liked' : '');
  likeBtn.innerHTML = `${ICONS.heart}<span class="count">${video.likes.length}</span>`;
  likeBtn.addEventListener('click', async () => {
    const i = video.likes.indexOf(me);
    if (i >= 0) video.likes.splice(i, 1);
    else video.likes.push(me);
    await dbPutVideo(video);
    likeBtn.classList.toggle('liked', video.likes.includes(me));
    likeBtn.querySelector('.count').textContent = video.likes.length;
  });

  const commentBtn = document.createElement('button');
  commentBtn.className = 'action-btn';
  commentBtn.innerHTML = `${ICONS.comment}<span class="count">${video.comments.length}</span>`;
  commentBtn.addEventListener('click', () => openComments(video.id));

  actions.append(likeBtn, commentBtn);
  el.appendChild(actions);
  return el;
}

// ---------------- Kommentare ----------------
let activeCommentVideoId = null;

async function openComments(videoId) {
  activeCommentVideoId = videoId;
  await renderComments();
  $('#comments-overlay').classList.remove('hidden');
  $('#comment-input').focus();
}

async function renderComments() {
  const videos = await dbGetAllVideos();
  const video = videos.find(v => v.id === activeCommentVideoId);
  if (!video) return;
  $('#comments-title').textContent = `Kommentare (${video.comments.length})`;
  const list = $('#comments-list');
  list.innerHTML = '';
  if (video.comments.length === 0) {
    list.innerHTML = '<p style="color:#a8a8a8;text-align:center;margin-top:30px">Noch keine Kommentare. Sei der Erste!</p>';
    return;
  }
  video.comments.forEach(c => {
    const row = document.createElement('div');
    row.className = 'comment';
    const av = document.createElement('img');
    av.src = avatarOf(c.user);
    const body = document.createElement('div');
    body.className = 'c-body';
    const user = document.createElement('div');
    user.className = 'c-user';
    user.textContent = '@' + c.user;
    const text = document.createElement('div');
    text.className = 'c-text';
    text.textContent = c.text;
    body.append(user, text);
    row.append(av, body);
    list.appendChild(row);
  });
  list.scrollTop = list.scrollHeight;
}

$('#comments-close').addEventListener('click', () => {
  $('#comments-overlay').classList.add('hidden');
  activeCommentVideoId = null;
});
$('#comments-overlay').addEventListener('click', e => {
  if (e.target === $('#comments-overlay')) {
    $('#comments-overlay').classList.add('hidden');
    activeCommentVideoId = null;
  }
});

$('#comment-form').addEventListener('submit', async e => {
  e.preventDefault();
  const text = $('#comment-input').value.trim();
  if (!text || !activeCommentVideoId) return;
  const videos = await dbGetAllVideos();
  const video = videos.find(v => v.id === activeCommentVideoId);
  if (!video) return;
  video.comments.push({ user: currentUser(), text, ts: Date.now() });
  await dbPutVideo(video);
  $('#comment-input').value = '';
  await renderComments();
  // Kommentar-Zähler im Feed aktualisieren
  const shortEl = document.querySelector(`.short[data-id="${video.id}"] .action-btn:nth-child(2) .count`);
  if (shortEl) shortEl.textContent = video.comments.length;
});

// ---------------- Upload ----------------
let uploadFile = null;
let uploadDuration = 0;

$('#video-file').addEventListener('change', () => {
  const file = $('#video-file').files[0];
  const errEl = $('#upload-error');
  errEl.textContent = '';
  uploadFile = null;
  $('#upload-submit').disabled = true;
  if (!file) return;

  const preview = $('#upload-preview');
  const url = URL.createObjectURL(file);
  preview.src = url;
  preview.classList.remove('hidden');

  preview.onloadedmetadata = () => {
    uploadDuration = preview.duration;
    if (uploadDuration > 60.5) {
      errEl.textContent = `Das Video ist ${Math.round(uploadDuration)} Sekunden lang – maximal 1 Minute erlaubt!`;
      preview.classList.add('hidden');
      $('#video-file').value = '';
      return;
    }
    uploadFile = file;
    $('#video-drop-text').textContent = file.name;
    $('#video-drop').classList.add('ready');
    $('#upload-submit').disabled = false;
  };
  preview.onerror = () => {
    errEl.textContent = 'Diese Datei kann nicht als Video gelesen werden.';
    preview.classList.add('hidden');
  };
});

$('#upload-form').addEventListener('submit', async e => {
  e.preventDefault();
  const title = $('#video-title').value.trim();
  const errEl = $('#upload-error');
  if (!uploadFile) { errEl.textContent = 'Bitte zuerst ein Video auswählen.'; return; }
  if (!title) { errEl.textContent = 'Bitte gib dem Video einen Namen.'; return; }

  const video = {
    id: 'v_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    title,
    uploader: currentUser(),
    blob: uploadFile,
    likes: [],
    comments: [],
    ts: Date.now()
  };

  try {
    await dbPutVideo(video);
  } catch (err) {
    errEl.textContent = 'Speichern fehlgeschlagen (evtl. zu wenig Speicherplatz im Browser).';
    return;
  }

  // Formular zurücksetzen
  uploadFile = null;
  $('#video-file').value = '';
  $('#video-title').value = '';
  $('#upload-preview').classList.add('hidden');
  $('#video-drop-text').textContent = 'Video auswählen (max. 1 Minute)';
  $('#video-drop').classList.remove('ready');
  $('#upload-submit').disabled = true;
  errEl.textContent = '';

  showPage('feed');
});

// ---------------- Suche ----------------
$('#search-input').addEventListener('input', () => {
  showPageIfNot('search');
  renderSearch($('#search-input').value);
});
$('#search-input').addEventListener('focus', () => showPageIfNot('search'));
$('#search-btn').addEventListener('click', () => {
  showPageIfNot('search');
  $('#search-input').focus();
});

function showPageIfNot(name) {
  if (!$('#page-' + name).classList.contains('active')) showPage(name);
}

async function renderSearch(query) {
  const q = (query || '').trim().toLowerCase();
  const results = $('#search-results');
  results.innerHTML = '';
  const videos = await dbGetAllVideos();
  const matches = q
    ? videos.filter(v => v.title.toLowerCase().includes(q) || v.uploader.toLowerCase().includes(q))
    : videos.slice().sort((a, b) => b.ts - a.ts);
  $('#search-empty').classList.toggle('hidden', matches.length > 0);
  matches.forEach(v => results.appendChild(buildGridItem(v)));
}

function buildGridItem(video, { deletable = false } = {}) {
  const item = document.createElement('div');
  item.className = 'grid-item';
  const vid = document.createElement('video');
  vid.src = URL.createObjectURL(video.blob);
  vid.muted = true;
  vid.preload = 'metadata';
  const title = document.createElement('div');
  title.className = 'grid-title';
  title.textContent = video.title;
  const likes = document.createElement('div');
  likes.className = 'grid-likes';
  likes.innerHTML = ICONS.heart + ' ' + video.likes.length;
  item.append(vid, title, likes);

  item.addEventListener('click', () => openSingleVideo(video.id));

  if (deletable) {
    const del = document.createElement('button');
    del.className = 'grid-likes grid-delete';
    del.innerHTML = ICONS.trash;
    del.title = 'Video löschen';
    del.addEventListener('click', async e => {
      e.stopPropagation();
      if (confirm(`„${video.title}" wirklich löschen?`)) {
        await dbDeleteVideo(video.id);
        renderProfile(profileViewUser || currentUser());
      }
    });
    item.appendChild(del);
  }
  return item;
}

// Einzelnes Video im Feed öffnen (aus Suche/Profil)
async function openSingleVideo(videoId) {
  showPage('feed');
  // Warten, bis der Feed gerendert ist, dann zum Video scrollen
  requestAnimationFrame(() => {
    const el = document.querySelector(`.short[data-id="${videoId}"]`);
    if (el) el.scrollIntoView();
  });
}

// ---------------- Profil ----------------
async function renderProfile(username) {
  const isOwn = username === currentUser();
  const users = getUsers();
  const user = users[username];
  const container = $('#profile-content');
  container.innerHTML = '';
  if (!user) { container.textContent = 'Profil nicht gefunden.'; return; }

  const videos = (await dbGetAllVideos()).filter(v => v.uploader === username).sort((a, b) => b.ts - a.ts);
  const followers = followersOf(username);
  const following = user.following || [];
  const totalLikes = videos.reduce((sum, v) => sum + v.likes.length, 0);

  const header = document.createElement('div');
  header.className = 'profile-header';

  const avatarWrap = document.createElement('div');
  avatarWrap.className = 'profile-avatar-wrap';
  const avatar = document.createElement('img');
  avatar.className = 'profile-avatar';
  avatar.src = avatarOf(username);
  avatarWrap.appendChild(avatar);

  if (isOwn) {
    const editBtn = document.createElement('button');
    editBtn.className = 'avatar-edit';
    editBtn.innerHTML = ICONS.pencil;
    editBtn.title = 'Profilbild ändern';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.hidden = true;
    editBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      resizeImageToDataURL(file, 192).then(dataURL => {
        const u = getUsers();
        u[username].avatar = dataURL;
        saveUsers(u);
        renderProfile(username);
      });
    });
    avatarWrap.append(editBtn, fileInput);
  }

  const nameEl = document.createElement('div');
  nameEl.className = 'profile-name';
  nameEl.textContent = '@' + username;

  const stats = document.createElement('div');
  stats.className = 'profile-stats';
  stats.innerHTML = `
    <div class="stat"><b>${following.length}</b><span>Gefolgt</span></div>
    <div class="stat"><b>${followers.length}</b><span>Follower</span></div>
    <div class="stat"><b>${totalLikes}</b><span>Likes</span></div>
  `;

  const actions = document.createElement('div');
  actions.className = 'profile-actions';
  if (isOwn) {
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn-secondary';
    logoutBtn.textContent = 'Abmelden';
    logoutBtn.addEventListener('click', logout);
    actions.appendChild(logoutBtn);
  } else {
    const followBtn = document.createElement('button');
    const upd = () => {
      followBtn.className = isFollowing(username) ? 'btn-secondary' : 'btn-primary';
      followBtn.style.padding = '8px 22px';
      followBtn.textContent = isFollowing(username) ? 'Gefolgt ✓' : 'Folgen';
    };
    upd();
    followBtn.addEventListener('click', () => { toggleFollow(username); renderProfile(username); });
    actions.appendChild(followBtn);
  }

  header.append(avatarWrap, nameEl, stats, actions);
  container.appendChild(header);

  const sectionTitle = document.createElement('div');
  sectionTitle.className = 'profile-section-title';
  sectionTitle.textContent = `Videos (${videos.length})`;
  container.appendChild(sectionTitle);

  const grid = document.createElement('div');
  grid.className = 'video-grid';
  if (videos.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="13" height="14" rx="2.5"/><path d="M16 10.5l5-3v9l-5-3"/></svg><p>Noch keine Videos hochgeladen.</p>';
    container.appendChild(empty);
  } else {
    videos.forEach(v => grid.appendChild(buildGridItem(v, { deletable: isOwn })));
    container.appendChild(grid);
  }
}

// Profilbild verkleinern, damit localStorage nicht überläuft
function resizeImageToDataURL(file, size) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// ---------------- Start ----------------
(async function init() {
  await openDB();
  if (currentUser() && getUsers()[currentUser()]) {
    enterApp();
  }
})();
