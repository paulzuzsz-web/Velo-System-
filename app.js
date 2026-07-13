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

const VERIFY_CODE = 'ShortHubBlau()';
const CEO_CODE = 'CEO_Bastian()';

function avatarOf(username) {
  const u = getUsers()[username];
  return (u && u.avatar) || DEFAULT_AVATAR;
}

function displayNameOf(username) {
  const u = getUsers()[username];
  return (u && u.displayName) || username;
}

function isVerified(username) {
  const u = getUsers()[username];
  return !!(u && u.verified);
}

function isCEO(username) {
  const u = getUsers()[username];
  return !!(u && u.ceo);
}

// Profilbild, bei CEO-Nutzern mit Krone darüber
function avatarWithCrown(username, imgClass) {
  const wrap = document.createElement('div');
  wrap.className = 'avatar-crown-wrap';
  const img = document.createElement('img');
  img.className = imgClass || '';
  img.src = avatarOf(username);
  wrap.appendChild(img);
  if (isCEO(username)) {
    const crown = document.createElement('div');
    crown.className = 'ceo-crown';
    crown.textContent = 'CEO';
    wrap.appendChild(crown);
  }
  return wrap;
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
  share: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 3.5c0-.9 1.1-1.4 1.7-.7l7 6.5c.4.4.4 1 0 1.4l-7 6.5c-.6.7-1.7.2-1.7-.7v-3c-4.6 0-7.9 1.5-10.3 4.7-.5.6-1.4.2-1.3-.6C3.2 11.6 7.4 7.8 14 7.3v-3.8z"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 5C6.7 5 2.6 9.1 1.2 11.5c-.2.3-.2.7 0 1C2.6 14.9 6.7 19 12 19s9.4-4.1 10.8-6.5c.2-.3.2-.7 0-1C21.4 9.1 17.3 5 12 5zm0 11a4 4 0 110-8 4 4 0 010 8zm0-2.2a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2"/></svg>',
  pencil: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 17.3V20h2.7L17.8 8.9l-2.7-2.7L4 17.3zM20.7 6c.4-.4.4-1 0-1.4l-1.3-1.3c-.4-.4-1-.4-1.4 0l-1.5 1.5 2.7 2.7L20.7 6z"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.2a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 110-4h.2a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3h.1a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.2a1.6 1.6 0 001 1.5h.1a1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8v.1a1.6 1.6 0 001.5 1h.2a2 2 0 110 4h-.2a1.6 1.6 0 00-1.5 1z"/></svg>',
  badge: '<svg class="verified-badge" viewBox="0 0 24 24"><path fill="#20d5ec" d="M12 1.5l2.6 2 3.3-.3 1 3.1 2.9 1.7-1.2 3 1.2 3-2.9 1.7-1 3.1-3.3-.3-2.6 2-2.6-2-3.3.3-1-3.1L2.2 14l1.2-3-1.2-3 2.9-1.7 1-3.1 3.3.3 2.6-2z"/><path fill="#fff" d="M10.9 15.4l-3-3 1.4-1.4 1.6 1.6 4-4.3 1.5 1.4-5.5 5.7z"/></svg>'
};

function nameWithBadge(username, useDisplayName) {
  const span = document.createElement('span');
  span.className = 'name-with-badge';
  span.append(useDisplayName ? displayNameOf(username) : '@' + username);
  if (isVerified(username)) {
    const b = document.createElement('span');
    b.innerHTML = ICONS.badge;
    b.title = t('verified');
    span.appendChild(b.firstChild);
  }
  return span;
}

// ---------------- Toast ----------------
let toastTimer = null;
function showToast(msg) {
  const toast = $('#toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2400);
}

// ---------------- Auth-Screen ----------------
let authMode = 'login';

function setAuthMode(mode) {
  authMode = mode;
  $('#auth-title').textContent = t(mode);
  $('#auth-submit').textContent = t(mode);
  $('#auth-switch-text').textContent = mode === 'login' ? t('noAccount') : t('haveAccount');
  $('#auth-toggle').textContent = mode === 'login' ? t('register') : t('login');
  $('#auth-error').textContent = '';
}

$('#auth-toggle').addEventListener('click', () => {
  setAuthMode(authMode === 'login' ? 'register' : 'login');
});

$('#auth-form').addEventListener('submit', async e => {
  e.preventDefault();
  const username = $('#auth-username').value.trim();
  const password = $('#auth-password').value;
  const errEl = $('#auth-error');
  errEl.textContent = '';

  if (!/^[\wäöüÄÖÜß.-]{3,24}$/.test(username)) {
    errEl.textContent = t('badUsername');
    return;
  }

  const users = getUsers();
  const hash = await hashPassword(password);

  if (authMode === 'register') {
    if (users[username]) {
      errEl.textContent = t('userTaken');
      return;
    }
    users[username] = { password: hash, avatar: null, following: [], displayName: username, verified: false };
    saveUsers(users);
  } else {
    if (!users[username] || users[username].password !== hash) {
      errEl.textContent = t('loginFail');
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
  handleDeepLink();
}

function logout() {
  setSession(null);
  location.reload();
}

// Geteilter Link (?v=<video-id>) öffnet das Video direkt
async function handleDeepLink() {
  const videoId = new URLSearchParams(location.search).get('v');
  if (!videoId) return;
  history.replaceState(null, '', location.pathname);
  await openSingleVideo(videoId);
}

// ---------------- Navigation ----------------
let profileViewUser = null; // welches Profil gerade angezeigt wird
let feedReady = Promise.resolve();

function showPage(name) {
  $$('.page').forEach(p => p.classList.remove('active'));
  $('#page-' + name).classList.add('active');
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === name));
  $('#app').classList.toggle('feed-mode', name === 'feed');
  pauseAllVideos();
  if (name === 'feed') feedReady = renderFeed();
  if (name === 'profile') renderProfile(profileViewUser || currentUser());
  if (name === 'search') renderSearch($('#search-input').value);
  if (name === 'settings') renderSettings();
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
// Gewichtete Zufallsreihenfolge: neue Videos und Videos mit wenigen
// Likes bekommen ein höheres Gewicht und erscheinen dadurch öfter oben.
function weightedFeedOrder(videos) {
  const now = Date.now();
  const pool = videos.map(v => {
    const ageDays = (now - v.ts) / 86400000;
    const recencyBoost = Math.max(0, 1 - ageDays / 7);   // neu = innerhalb 1 Woche
    const lowLikeBoost = 1 / (1 + v.likes.length);        // wenige Likes = höher
    return { v, w: 0.5 + 2.5 * recencyBoost + 2 * lowLikeBoost };
  });
  const out = [];
  while (pool.length) {
    const total = pool.reduce((s, p) => s + p.w, 0);
    let r = Math.random() * total, i = 0;
    for (; i < pool.length - 1; i++) { r -= pool[i].w; if (r <= 0) break; }
    out.push(pool.splice(i, 1)[0].v);
  }
  return out;
}

let feedObserver = null;

async function renderFeed() {
  const container = $('#feed-container');
  container.innerHTML = '';
  const videos = weightedFeedOrder(await dbGetAllVideos());
  $('#feed-empty').classList.toggle('hidden', videos.length > 0);

  if (feedObserver) feedObserver.disconnect();
  feedObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const vid = entry.target.querySelector('video');
      if (!vid) return;
      if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
        vid.play().catch(() => {});
        // Aufruf zählen – einmal pro Video und Feed-Durchlauf
        if (!entry.target.dataset.viewed) {
          entry.target.dataset.viewed = '1';
          countView(entry.target.dataset.id, entry.target);
        }
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

async function countView(videoId, shortEl) {
  const videos = await dbGetAllVideos();
  const video = videos.find(v => v.id === videoId);
  if (!video) return;
  video.views = (video.views || 0) + 1;
  await dbPutVideo(video);
  const viewsEl = shortEl.querySelector('.views-display .count');
  if (viewsEl) viewsEl.textContent = video.views;
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
  // Hochformat füllt den ganzen Bildschirm, Querformat wird eingepasst
  vid.addEventListener('loadedmetadata', () => {
    vid.style.objectFit = vid.videoHeight >= vid.videoWidth ? 'cover' : 'contain';
  });
  vid.addEventListener('click', () => vid.paused ? vid.play() : vid.pause());
  el.appendChild(vid);

  // Info unten links
  const info = document.createElement('div');
  info.className = 'short-info';
  const uploaderRow = document.createElement('div');
  uploaderRow.className = 'uploader';
  const av = document.createElement('img');
  av.src = avatarOf(video.uploader);
  uploaderRow.append(av, nameWithBadge(video.uploader, true));
  uploaderRow.addEventListener('click', () => {
    profileViewUser = video.uploader;
    showPage('profile');
  });

  if (video.uploader !== me) {
    const followBtn = document.createElement('button');
    const updFollow = () => {
      followBtn.className = 'follow-chip' + (isFollowing(video.uploader) ? ' following' : '');
      followBtn.textContent = isFollowing(video.uploader) ? t('following') : t('follow');
    };
    updFollow();
    followBtn.addEventListener('click', e => {
      e.stopPropagation();
      toggleFollow(video.uploader);
      updFollow();
    });
    uploaderRow.appendChild(followBtn);
  }

  const title = document.createElement('div');
  title.className = 'video-title';
  title.textContent = video.title;
  info.append(uploaderRow, title);
  el.appendChild(info);

  // Aktionen rechts – oben der Ersteller des Videos (wie bei TikTok)
  const actions = document.createElement('div');
  actions.className = 'short-actions';

  const creator = document.createElement('button');
  creator.className = 'creator-avatar';
  creator.title = displayNameOf(video.uploader);
  creator.appendChild(avatarWithCrown(video.uploader, 'creator-img'));
  creator.addEventListener('click', () => {
    profileViewUser = video.uploader;
    showPage('profile');
  });
  if (video.uploader !== me && !isFollowing(video.uploader)) {
    const plus = document.createElement('span');
    plus.className = 'creator-follow';
    plus.textContent = '+';
    plus.addEventListener('click', e => {
      e.stopPropagation();
      toggleFollow(video.uploader);
      plus.remove();
      const chip = el.querySelector('.follow-chip');
      if (chip) { chip.classList.add('following'); chip.textContent = t('following'); }
    });
    creator.appendChild(plus);
  }
  actions.appendChild(creator);

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

  // Aufrufe direkt unter den Likes
  const viewsDisplay = document.createElement('div');
  viewsDisplay.className = 'action-btn views-display';
  viewsDisplay.innerHTML = `${ICONS.eye}<span class="count">${video.views || 0}</span>`;

  const commentBtn = document.createElement('button');
  commentBtn.className = 'action-btn comment-btn';
  commentBtn.innerHTML = `${ICONS.comment}<span class="count">${video.comments.length}</span>`;
  commentBtn.addEventListener('click', () => openComments(video.id));

  const shareBtn = document.createElement('button');
  shareBtn.className = 'action-btn share-btn';
  shareBtn.innerHTML = `${ICONS.share}<span class="count">${t('share')}</span>`;
  shareBtn.addEventListener('click', () => shareVideo(video));

  actions.append(likeBtn, viewsDisplay, commentBtn, shareBtn);
  el.appendChild(actions);
  return el;
}

// ---------------- Teilen ----------------
async function shareVideo(video) {
  const url = location.origin + location.pathname + '?v=' + encodeURIComponent(video.id);
  const shareData = {
    title: 'Short Hub',
    text: `${video.title} – @${video.uploader}`,
    url
  };
  if (navigator.share) {
    try { await navigator.share(shareData); return; } catch { /* abgebrochen */ }
  }
  try {
    await navigator.clipboard.writeText(url);
    showToast(t('linkCopied'));
  } catch {
    prompt('Link:', url);
  }
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
  $('#comments-title').textContent = `${t('comments')} (${video.comments.length})`;
  const list = $('#comments-list');
  list.innerHTML = '';
  if (video.comments.length === 0) {
    const p = document.createElement('p');
    p.style.cssText = 'color:#a8a8a8;text-align:center;margin-top:30px';
    p.textContent = t('noComments');
    list.appendChild(p);
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
    user.appendChild(nameWithBadge(c.user, false));
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
  const shortEl = document.querySelector(`.short[data-id="${video.id}"] .comment-btn .count`);
  if (shortEl) shortEl.textContent = video.comments.length;
});

// ---------------- Upload (mit FSK-12-Prüfung) ----------------
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
      errEl.textContent = t('tooLong');
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
    errEl.textContent = t('notVideo');
    preview.classList.add('hidden');
  };
});

$('#upload-form').addEventListener('submit', async e => {
  e.preventDefault();
  const title = $('#video-title').value.trim();
  const errEl = $('#upload-error');
  if (!uploadFile) { errEl.textContent = t('needVideo'); return; }
  if (!title) { errEl.textContent = t('needName'); return; }

  // FSK-12: alle Punkte müssen bestätigt sein
  const checks = [...$$('.fsk-check')];
  if (!checks.every(c => c.checked)) {
    errEl.textContent = t('fskRequired');
    return;
  }
  errEl.textContent = '';

  // FSK-12-Prüfung (Dauer-Check + bestätigte Selbstauskunft)
  const submitBtn = $('#upload-submit');
  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.innerHTML = `<span class="spinner"></span> ${t('checking')}`;
  await new Promise(r => setTimeout(r, 1800));
  if (uploadDuration > 60.5) { // Sicherheitsnetz
    submitBtn.textContent = originalText;
    errEl.textContent = t('tooLong');
    return;
  }
  showToast(t('fskPassed'));
  submitBtn.textContent = originalText;

  const video = {
    id: 'v_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    title,
    uploader: currentUser(),
    blob: uploadFile,
    likes: [],
    comments: [],
    views: 0,
    fsk12Checked: true,
    ts: Date.now()
  };

  try {
    await dbPutVideo(video);
  } catch (err) {
    submitBtn.disabled = false;
    errEl.textContent = t('saveFailed');
    return;
  }

  // Formular zurücksetzen
  uploadFile = null;
  $('#video-file').value = '';
  $('#video-title').value = '';
  $('#upload-preview').classList.add('hidden');
  $('#video-drop-text').textContent = t('chooseVideo');
  $('#video-drop').classList.remove('ready');
  checks.forEach(c => { c.checked = false; });
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
    ? videos.filter(v =>
        v.title.toLowerCase().includes(q) ||
        v.uploader.toLowerCase().includes(q) ||
        displayNameOf(v.uploader).toLowerCase().includes(q))
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
  const views = document.createElement('div');
  views.className = 'grid-likes grid-views';
  views.innerHTML = ICONS.eye + ' ' + (video.views || 0);
  item.append(vid, title, likes, views);

  item.addEventListener('click', () => openSingleVideo(video.id));

  if (deletable) {
    const del = document.createElement('button');
    del.className = 'grid-likes grid-delete';
    del.innerHTML = ICONS.trash;
    del.addEventListener('click', async e => {
      e.stopPropagation();
      if (confirm(t('deleteConfirm', { name: video.title }))) {
        await dbDeleteVideo(video.id);
        renderProfile(profileViewUser || currentUser());
      }
    });
    item.appendChild(del);
  }
  return item;
}

// Einzelnes Video im Feed öffnen (aus Suche/Profil/geteiltem Link)
async function openSingleVideo(videoId) {
  showPage('feed');
  await feedReady;
  const el = document.querySelector(`.short[data-id="${videoId}"]`);
  if (el) el.scrollIntoView();
}

// ---------------- Profil ----------------
async function renderProfile(username) {
  const isOwn = username === currentUser();
  const users = getUsers();
  const user = users[username];
  const container = $('#profile-content');
  container.innerHTML = '';
  if (!user) { container.textContent = '…'; return; }

  const videos = (await dbGetAllVideos()).filter(v => v.uploader === username).sort((a, b) => b.ts - a.ts);
  const followers = followersOf(username);
  const following = user.following || [];
  const totalLikes = videos.reduce((sum, v) => sum + v.likes.length, 0);

  const header = document.createElement('div');
  header.className = 'profile-header';

  const avatarWrap = document.createElement('div');
  avatarWrap.className = 'profile-avatar-wrap';
  avatarWrap.appendChild(avatarWithCrown(username, 'profile-avatar'));

  if (isOwn) {
    const editBtn = document.createElement('button');
    editBtn.className = 'avatar-edit';
    editBtn.innerHTML = ICONS.pencil;
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
  nameEl.appendChild(nameWithBadge(username, true));
  const handleEl = document.createElement('div');
  handleEl.className = 'profile-handle';
  handleEl.textContent = '@' + username;

  const stats = document.createElement('div');
  stats.className = 'profile-stats';
  [
    [following.length, t('statFollowing'), () => openUserList(t('statFollowing'), following)],
    [followers.length, t('statFollowers'), () => openUserList(t('statFollowers'), followers)],
    [totalLikes, t('statLikes'), null]
  ].forEach(([num, label, onClick]) => {
    const stat = document.createElement('div');
    stat.className = 'stat' + (onClick ? ' stat-clickable' : '');
    const b = document.createElement('b');
    b.textContent = num;
    const s = document.createElement('span');
    s.textContent = label;
    stat.append(b, s);
    if (onClick) stat.addEventListener('click', onClick);
    stats.appendChild(stat);
  });

  const actions = document.createElement('div');
  actions.className = 'profile-actions';
  if (isOwn) {
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'btn-secondary btn-icon-text';
    settingsBtn.innerHTML = ICONS.gear + `<span>${t('settings')}</span>`;
    settingsBtn.addEventListener('click', () => showPage('settings'));
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn-secondary';
    logoutBtn.textContent = t('logout');
    logoutBtn.addEventListener('click', logout);
    actions.append(settingsBtn, logoutBtn);
  } else {
    const followBtn = document.createElement('button');
    const upd = () => {
      followBtn.className = isFollowing(username) ? 'btn-secondary' : 'btn-gradient btn-inline';
      followBtn.textContent = isFollowing(username) ? t('following') : t('follow');
    };
    upd();
    followBtn.addEventListener('click', () => { toggleFollow(username); renderProfile(username); });
    actions.appendChild(followBtn);
  }

  header.append(avatarWrap, nameEl, handleEl, stats, actions);
  container.appendChild(header);

  const sectionTitle = document.createElement('div');
  sectionTitle.className = 'profile-section-title';
  sectionTitle.textContent = `${t('videosCount')} (${videos.length})`;
  container.appendChild(sectionTitle);

  if (videos.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="13" height="14" rx="2.5"/><path d="M16 10.5l5-3v9l-5-3"/></svg>';
    const p = document.createElement('p');
    p.textContent = t('noVideosProfile');
    empty.appendChild(p);
    container.appendChild(empty);
  } else {
    const grid = document.createElement('div');
    grid.className = 'video-grid';
    videos.forEach(v => grid.appendChild(buildGridItem(v, { deletable: isOwn })));
    container.appendChild(grid);
  }
}

// ---------------- Follower-/Gefolgt-Liste ----------------
function openUserList(title, usernames) {
  $('#userlist-title').textContent = `${title} (${usernames.length})`;
  const list = $('#userlist-list');
  list.innerHTML = '';
  usernames.forEach(name => {
    const row = document.createElement('button');
    row.className = 'userlist-row';
    row.appendChild(avatarWithCrown(name, 'userlist-avatar'));
    const info = document.createElement('div');
    info.className = 'userlist-info';
    const dn = document.createElement('div');
    dn.className = 'userlist-name';
    dn.appendChild(nameWithBadge(name, true));
    const handle = document.createElement('div');
    handle.className = 'userlist-handle';
    handle.textContent = '@' + name;
    info.append(dn, handle);
    row.appendChild(info);
    row.addEventListener('click', () => {
      closeUserList();
      profileViewUser = name;
      showPage('profile');
    });
    list.appendChild(row);
  });
  $('#userlist-overlay').classList.remove('hidden');
}

function closeUserList() {
  $('#userlist-overlay').classList.add('hidden');
}

$('#userlist-close').addEventListener('click', closeUserList);
$('#userlist-overlay').addEventListener('click', e => {
  if (e.target === $('#userlist-overlay')) closeUserList();
});

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

// ---------------- Einstellungen ----------------
function settingsMsg(msg, isError) {
  const el = $('#settings-msg');
  el.textContent = msg;
  el.classList.toggle('error', !!isError);
  setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 3000);
}

function renderSettings() {
  const users = getUsers();
  const me = users[currentUser()];
  if (!me) return;
  $('#set-displayname').value = me.displayName || currentUser();
  $('#set-username').value = currentUser();
  $('#set-pw-current').value = '';
  $('#set-pw-new').value = '';
  $('#set-code').value = '';

  // Sprachauswahl füllen
  const select = $('#set-language');
  select.innerHTML = '';
  Object.entries(LANG_NAMES).forEach(([code, name]) => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = name;
    if (code === getLang()) opt.selected = true;
    select.appendChild(opt);
  });

  // Verifizierungs-/CEO-Status
  const status = $('#code-status');
  const parts = [];
  if (me.verified) parts.push(ICONS.badge + ' ' + t('verified'));
  if (me.ceo) parts.push('<span class="ceo-crown ceo-inline">CEO</span> 👑');
  if (parts.length) {
    status.innerHTML = parts.join('&nbsp;&nbsp;');
    status.classList.remove('hidden');
  } else {
    status.classList.add('hidden');
  }
}

$('#settings-back').addEventListener('click', () => { profileViewUser = null; showPage('profile'); });

// Anzeigename speichern
$('#save-displayname').addEventListener('click', () => {
  const name = $('#set-displayname').value.trim();
  if (!name) return;
  const users = getUsers();
  users[currentUser()].displayName = name;
  saveUsers(users);
  settingsMsg(t('saved'));
});

// Benutzername ändern (inkl. Migration aller Verweise)
$('#save-username').addEventListener('click', async () => {
  const newName = $('#set-username').value.trim();
  const oldName = currentUser();
  if (newName === oldName) return;
  if (!/^[\wäöüÄÖÜß.-]{3,24}$/.test(newName)) { settingsMsg(t('badUsername'), true); return; }
  const users = getUsers();
  if (users[newName]) { settingsMsg(t('userTaken'), true); return; }

  users[newName] = users[oldName];
  delete users[oldName];
  if ((users[newName].displayName || '') === oldName) users[newName].displayName = newName;
  Object.values(users).forEach(u => {
    u.following = (u.following || []).map(n => n === oldName ? newName : n);
  });
  saveUsers(users);

  const videos = await dbGetAllVideos();
  for (const v of videos) {
    let changed = false;
    if (v.uploader === oldName) { v.uploader = newName; changed = true; }
    if (v.likes.includes(oldName)) { v.likes = v.likes.map(n => n === oldName ? newName : n); changed = true; }
    v.comments.forEach(c => { if (c.user === oldName) { c.user = newName; changed = true; } });
    if (changed) await dbPutVideo(v);
  }

  setSession(newName);
  settingsMsg(t('saved'));
});

// Passwort ändern
$('#save-password').addEventListener('click', async () => {
  const current = $('#set-pw-current').value;
  const next = $('#set-pw-new').value;
  if (!next || next.length < 4) return;
  const users = getUsers();
  const me = users[currentUser()];
  if (me.password !== await hashPassword(current)) { settingsMsg(t('wrongPw'), true); return; }
  me.password = await hashPassword(next);
  saveUsers(users);
  $('#set-pw-current').value = '';
  $('#set-pw-new').value = '';
  settingsMsg(t('saved'));
});

// Sprache wechseln
$('#set-language').addEventListener('change', () => {
  setLang($('#set-language').value);
  applyI18n();
  setAuthMode(authMode);
  renderSettings();
  settingsMsg(t('saved'));
});

// Codes einlösen (blauer Haken / CEO-Krone)
$('#redeem-code').addEventListener('click', () => {
  const code = $('#set-code').value.trim();
  if (code === VERIFY_CODE || code === CEO_CODE) {
    const users = getUsers();
    if (code === VERIFY_CODE) users[currentUser()].verified = true;
    else users[currentUser()].ceo = true;
    saveUsers(users);
    $('#set-code').value = '';
    renderSettings();
    showToast(code === VERIFY_CODE ? t('codeOk') : t('ceoOk'));
  } else {
    settingsMsg(t('codeWrong'), true);
  }
});

// ---------------- Start ----------------
(async function init() {
  setLang(getLang());
  applyI18n();
  setAuthMode('login');
  await openDB();
  if (currentUser() && getUsers()[currentUser()]) {
    enterApp();
  }
})();
