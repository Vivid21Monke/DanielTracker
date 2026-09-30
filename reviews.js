// ===== Birthday reviews =====
// To let EVERYONE see the reviews, paste your Firebase Realtime Database URL here
// (no trailing slash), e.g. 'https://daniel-tracker-default-rtdb.europe-west1.firebasedatabase.app'
// Leave it empty and reviews are saved only in this browser.
const DB_URL = 'https://danieltracker-default-rtdb.europe-west1.firebasedatabase.app';

const $r = id => document.getElementById(id);
let photoData = '';

$r('rev-note').textContent = DB_URL
  ? 'Reviews are shared: everyone who opens this page sees them.'
  : 'Reviews are saved on this device only (set DB_URL in reviews.js to share them with everyone).';

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
    if (DB_URL) {
      const r = await fetch(DB_URL + '/reviews.json'); const d = await r.json() || {};
      return Object.values(d);
    }
    return JSON.parse(localStorage.getItem('dt-reviews') || '[]');
  } catch (e) { return []; }
}

async function saveReview(rev) {
  if (DB_URL) {
    await fetch(DB_URL + '/reviews.json', { method: 'POST', body: JSON.stringify(rev) });
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
  } catch (e) { alert('Could not save the review. Try again.'); }
  $r('rev-send').disabled = false;
};

render();
if (DB_URL) setInterval(render, 15000); // pick up other people's reviews