// ===== Birthday reviews =====
// To let EVERYONE see the reviews, paste your Firebase Realtime Database URL here
// (no trailing slash), e.g. 'https://daniel-tracker-default-rtdb.europe-west1.firebasedatabase.app'
// Leave it empty and reviews are saved only in this browser.
const DB_URL = 'https://danieltracker-default-rtdb.europe-west1.firebasedatabase.app/';

const BASE = DB_URL.trim().replace(/\/+$/, '').replace(/^(?!https?:\/\/)(.+)/, 'https://$1');
const $r = id => document.getElementById(id);
let photoData = '';
const status = m => { $r('rev-status').textContent = m; };

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
      if (!r.ok) throw new Error('HTTP ' + r.status + (r.status === 401 ? ' (Firebase rules block reading: publish the rules)' : r.status === 404 ? ' (database URL is wrong)' : ''));
      const d = await r.json() || {};
      status('');
      return Object.values(d);
    }
    return JSON.parse(localStorage.getItem('dt-reviews') || '[]');
  } catch (e) { status('Could not load reviews: ' + e.message); return []; }
}

async function saveReview(rev) {
  if (BASE) {
    const r = await fetch(BASE + '/reviews.json', { method: 'POST', body: JSON.stringify(rev) });
    if (!r.ok) throw new Error('HTTP ' + r.status + (r.status === 401 ? ' (Firebase rules block writing: publish the rules)' : r.status === 404 ? ' (database URL is wrong)' : ''));
  } else {
    const all = JSON.parse(localStorage.getItem('dt-reviews') || '[]'); all.push(rev);
    localStorage.setItem('dt-reviews', JSON.stringify(all));
  }
}

async function render() {
  const list = (await loadReviews()).sort((a, b) => b.time - a.time);
  const box = $r('rev-list'); box.textContent = '';
  if (!list.length) { box.innerHTML = '<div class="mut">No reviews yet. Be the first!</div>'; return; }
  list.forEach(r => {
    const d = document.createElement('div'); d.className = 'review';
    const n = document.createElement('b'); n.textContent = r.name || 'Anonymous';
    const t = document.createElement('span'); t.className = 'mut'; t.textContent = ' · ' + new Date(r.time).toLocaleString();
    const p = document.createElement('p'); p.textContent = r.text;
    d.append(n, t, p);
    if (r.photo && String(r.photo).startsWith('data:image/')) { const i = document.createElement('img'); i.src = r.photo; d.append(i); }
    box.append(d);
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
    await render();
  } catch (e) { status('Could not save review: ' + e.message); }
  $r('rev-send').disabled = false;
};

render();
if (BASE) setInterval(render, 15000); // pick up other people's reviews