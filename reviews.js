// ===== Birthday reviews, reactions and photo wall =====
// Paste your Firebase Realtime Database URL between the quotes so EVERYONE sees the reviews.
// Leave it empty and everything is saved only in this browser.
const DB_URL = 'https://danieltracker-default-rtdb.europe-west1.firebasedatabase.app/';

const BASE = DB_URL.trim().replace(/\/+$/, '').replace(/^(?!https?:\/\/)(.+)/, 'https://$1');
const $r = id => document.getElementById(id);
let photoData = '';
const status = m => { $r('rev-status').textContent = m; };
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
      status('');
      return Object.entries(d).map(([id, v]) => ({ ...v, id }));
    }
    return store.get('dt-reviews', []).map(r => ({ ...r, id: r.id || 'l' + r.time }));
  } catch (e) { status('Could not load reviews: ' + e.message); return []; }
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
        try { await sendReaction(r.id, key); } catch (e) { status('Could not send reaction: ' + e.message); }
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
    status(''); await render();
  } catch (e) { status('Could not save review: ' + e.message); }
  $r('rev-send').disabled = false;
};

render();
if (BASE) setInterval(render, 15000); // pick up other people's reviews and reactions