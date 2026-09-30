// ===== Birthday reviews, reactions and photo wall =====
// Paste your Firebase Realtime Database URL between the quotes so EVERYONE sees the reviews.
// Leave it empty and everything is saved only in this browser.
const DB_URL = 'https://danieltracker-default-rtdb.europe-west1.firebasedatabase.app';

const BASE = DB_URL.trim().replace(/\/+$/, '').replace(/^(?!https?:\/\/)(.+)/, 'https://$1');
const $r = id => document.getElementById(id);
let photoData = '';
const setStatus = m => { $r('rev-status').textContent = m; };
const REACTS = [['laugh', '😂'], ['fire', '🔥'], ['skull', '💀']];

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const mine = store.get('dt-reacted', {});   // reactions this browser already gave
const httpErr = r => new Error('HTTP ' + r.status + (r.status === 401 || r.status === 403 ? ' (Firebase rules block this: publish the rules)' : r.status === 404 ? ' (database URL is wrong)' : ''));

// Resize photo to keep it small, then store as a data URL
$r('rev-photo').onchange = e => {
  const f = e.target.files[0];
  if (!f) return;
  const img = new Image();
  img.onload = () => {
    const k = Math.min(1, 700 / img.width), c = document.createElement('canvas');
    c.width = img.width * k; c.height = img.height * k;
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    photoData = c.toDataURL('image/jpeg', 0.7);
    $r('rev-preview').src = photoData; $r('rev-preview').style.display = 'block';
    $r('rev-photoname').textContent = f.name;
  };
  img.src = URL.createObjectURL(f);
};

async function loadReviews() {
  try {
    if (BASE) {
      const r = await fetch(BASE + '/reviews.json');
      if (!r.ok) throw httpErr(r);
      const d = await r.json() || {};
      setStatus('');
      return Object.entries(d).map(([id, v]) => ({ ...v, id }));
    }
    return store.get('dt-reviews', []).map(r => ({ ...r, id: r.id || 'l' + r.time }));
  } catch (e) { setStatus('Could not load reviews: ' + e.message); return []; }
}

async function saveReview(rev) {
  if (BASE) {
    const r = await fetch(BASE + '/reviews.json', { method: 'POST', body: JSON.stringify(rev) });
    if (!r.ok) throw httpErr(r);
  } else {
    const all = store.get('dt-reviews', []); all.push({ ...rev, id: 'l' + rev.time }); store.set('dt-reviews', all);
  }
}

async function sendReaction(id, key) {
  if (BASE) {
    // Firebase server-side +1 so simultaneous clicks don't overwrite each other
    const r = await fetch(BASE + '/reviews/' + id + '/reactions/' + key + '.json', { method: 'PUT', body: JSON.stringify({ '.sv': { increment: 1 } }) });
    if (!r.ok) throw httpErr(r);
  } else {
    const all = store.get('dt-reviews', []);
    const rv = all.find(x => (x.id || 'l' + x.time) === id);
    if (rv) { rv.reactions = rv.reactions || {}; rv.reactions[key] = (rv.reactions[key] || 0) + 1; store.set('dt-reviews', all); }
  }
}

function openLightbox(src) {
  const box = document.createElement('div'); box.className = 'lightbox';
  const i = document.createElement('img'); i.src = src; box.append(i);
  box.onclick = () => box.remove(); document.body.append(box);
}

async function render() {
  const list = (await loadReviews()).sort((a, b) => b.time - a.time);
  const box = $r('rev-list'); box.textContent = '';
  if (!list.length) box.innerHTML = '<div class="mut">No reviews yet. Be the first!</div>';
  list.forEach(r => {
    const d = document.createElement('div'); d.className = 'review';
    const n = document.createElement('b'); n.textContent = r.name || 'Anonymous';
    const t = document.createElement('span'); t.className = 'mut'; t.textContent = ' · ' + new Date(r.time).toLocaleString();
    const p = document.createElement('p'); p.textContent = r.text || '';
    d.append(n, t, p);
    if (r.photo && String(r.photo).startsWith('data:image/')) { const i = document.createElement('img'); i.src = r.photo; d.append(i); }
    const row = document.createElement('div'); row.className = 'reacts';
    REACTS.forEach(([key, emoji]) => {
      const b = document.createElement('button'); b.className = 'react' + (mine[r.id + key] ? ' on' : '');
      let count = (r.reactions && r.reactions[key]) || 0;
      const show = () => { b.textContent = emoji + ' ' + count; }; show();
      b.onclick = async () => {
        if (mine[r.id + key]) return;            // one reaction of each kind per browser
        mine[r.id + key] = true; store.set('dt-reacted', mine);
        count++; show(); b.classList.add('on');
        try { await sendReaction(r.id, key); } catch (e) { setStatus('Could not send reaction: ' + e.message); }
      };
      row.append(b);
    });
    d.append(row); box.append(d);
  });

  // Photo wall: every photo from every review
  const wall = $r('wall-grid'); wall.textContent = '';
  const photos = list.filter(r => r.photo && String(r.photo).startsWith('data:image/'));
  if (!photos.length) wall.innerHTML = '<div class="mut">No photos yet. Add one with your review!</div>';
  photos.forEach(r => {
    const i = document.createElement('img'); i.src = r.photo; i.alt = 'Photo by ' + (r.name || 'Anonymous');
    i.onclick = () => openLightbox(r.photo); wall.append(i);
  });
}

$r('rev-send').onclick = async () => {
  const text = $r('rev-text').value.trim();
  if (!text && !photoData) return;
  $r('rev-send').disabled = true;
  try {
    await saveReview({ name: $r('rev-name').value.trim().slice(0, 30), text: text.slice(0, 500), photo: photoData, time: Date.now() });
    $r('rev-text').value = ''; photoData = ''; $r('rev-photo').value = '';
    $r('rev-preview').style.display = 'none'; $r('rev-photoname').textContent = '';
    setStatus(''); await render();
  } catch (e) { setStatus('Could not save review: ' + e.message); }
  $r('rev-send').disabled = false;
};

render();
if (BASE) setInterval(render, 15000); // pick up other people's reviews and reactions

// ===== Golf fund contributions (saved in the database, shown in the progress bar) =====
const gstatus = m => { $r('golf-status').textContent = m; };

async function loadGolf() {
  try {
    if (BASE) {
      const r = await fetch(BASE + '/golf.json');
      if (!r.ok) throw httpErr(r);
      gstatus('');
      return Object.values(await r.json() || {});
    }
    return store.get('dt-golf', []);
  } catch (e) { gstatus('Could not load fund: ' + e.message); return []; }
}

async function renderGolfList() {
  const all = (await loadGolf()).sort((a, b) => b.time - a.time);
  renderGolf(all.reduce((sum, x) => sum + (Number(x.amount) || 0), 0));
  const box = $r('golf-list'); box.textContent = '';
  all.slice(0, 8).forEach(x => {
    const d = document.createElement('div'); d.className = 'stat';
    const a = document.createElement('span'); a.textContent = (x.name || 'Anonymous');
    const b = document.createElement('span'); b.textContent = '€' + x.amount + ' · ' + new Date(x.time).toLocaleDateString();
    d.append(a, b); box.append(d);
  });
}

$r('golf-send').onclick = async () => {
  const amount = Math.round(parseFloat($r('golf-input').value.replace(',', '.')) * 100) / 100;
  if (!(amount > 0 && amount <= 100000)) { gstatus('Enter a valid amount, like 20 or 12.50'); return; }
  const item = { name: $r('golf-name').value.trim().slice(0, 30), amount, time: Date.now() };
  $r('golf-send').disabled = true;
  try {
    if (BASE) {
      const r = await fetch(BASE + '/golf.json', { method: 'POST', body: JSON.stringify(item) });
      if (!r.ok) throw httpErr(r);
    } else {
      const all = store.get('dt-golf', []); all.push(item); store.set('dt-golf', all);
    }
    $r('golf-input').value = ''; gstatus('');
    await renderGolfList();
  } catch (e) { gstatus('Could not save: ' + e.message); }
  $r('golf-send').disabled = false;
};

renderGolfList();
if (BASE) setInterval(renderGolfList, 15000);

// ===== Press counters: touch grass + vape requests (saved in the database) =====
const shown = { touch: 0, vape: 0 };
let pendingClicks = 0;
const cstatus = m => { $r('cnt-status').textContent = m; };

function paint(k, animate) {
  const el = $r('cnt-' + k); el.textContent = shown[k];
  if (animate) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
}

function burst(btn, emoji) {
  const card = btn.parentElement;
  ['+1', emoji, emoji, '+1'].forEach((t, i) => {
    const f = document.createElement('span'); f.className = 'float'; f.textContent = t;
    f.style.left = (btn.offsetLeft + btn.offsetWidth / 2 + (Math.random() * 120 - 60)) + 'px';
    f.style.top = (btn.offsetTop + 4) + 'px';
    f.style.animationDelay = (i * 0.08) + 's';
    card.append(f); setTimeout(() => f.remove(), 1300);
  });
}

async function loadCounters() {
  try {
    if (BASE) {
      const r = await fetch(BASE + '/counters.json');
      if (!r.ok) throw httpErr(r);
      const d = await r.json() || {}; cstatus('');
      return { touch: d.touch || 0, vape: d.vape || 0 };
    }
    return store.get('dt-counters', { touch: 0, vape: 0 });
  } catch (e) { cstatus('Could not load counters: ' + e.message); return null; }
}

async function bumpCounter(k) {
  if (BASE) {
    const r = await fetch(BASE + '/counters/' + k + '.json', { method: 'PUT', body: JSON.stringify({ '.sv': { increment: 1 } }) });
    if (!r.ok) throw httpErr(r);
  } else { store.set('dt-counters', { touch: shown.touch, vape: shown.vape }); }
}

async function refreshCounters() {
  if (pendingClicks > 0) return;               // don't overwrite a click that is still saving
  const d = await loadCounters();
  if (d) { shown.touch = d.touch; shown.vape = d.vape; paint('touch'); paint('vape'); }
}

document.querySelectorAll('.pressbtn').forEach(b => b.onclick = async () => {
  const k = b.dataset.c;
  shown[k]++; paint(k, true); burst(b, b.dataset.emoji);
  b.classList.remove('pressed'); void b.offsetWidth; b.classList.add('pressed');
  pendingClicks++;
  try { await bumpCounter(k); } catch (e) { cstatus('Could not save: ' + e.message); }
  pendingClicks--;
});

refreshCounters();
if (BASE) setInterval(refreshCounters, 15000);