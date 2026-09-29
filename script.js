// Gallery: uses photos.js if present, otherwise falls back to photo1-4.jpg
// (photo code is guarded so a missing file can never stop the timers below)
const SRC = (typeof PHOTOS !== 'undefined') ? PHOTOS : ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg'];
const photo = document.getElementById('photo');
photo.src = SRC[0];
document.querySelectorAll('.tab').forEach((t, i) => t.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('on'));
  t.classList.add('on');
  photo.src = SRC[i];
});

// Random minutes between 0 and max (inclusive)
const rand = max => Math.floor(Math.random() * (max + 1));

// Last seen: from now up to 67 minutes ago
function updateSeen() {
  const m = rand(67);
  document.getElementById('seen').textContent = m === 0 ? 'Now' : m + ' min ago';
}

// Last time geeked: from now up to 8 hours ago
function updateGeeked() {
  const m = rand(8 * 60);
  const h = Math.floor(m / 60), r = m % 60;
  document.getElementById('geeked').textContent =
    m === 0 ? 'Now' : (h > 0 ? h + 'h ' + String(r).padStart(2, '0') + 'm ago' : r + ' min ago');
}

function updateAll() { updateSeen(); updateGeeked(); }
updateAll();
setInterval(updateAll, 5 * 60 * 1000); // change every 5 minutes

// Page time: how long you have been on the page
const pageStart = Date.now();
function updatePageTime() {
  const t = Math.floor((Date.now() - pageStart) / 1000);
  const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), sec = t % 60;
  document.getElementById('pagetime').textContent =
    (h ? h + 'h ' : '') + (h || m ? m + 'm ' : '') + sec + 's';
}
updatePageTime();
setInterval(updatePageTime, 1000);

// Daily random stats: new random numbers every 5 minutes
const setText = (id, v) => document.getElementById(id).textContent = v;
function updateStats() {
  setText('r-gaming', (Math.random() * 12).toFixed(1));
  setText('r-snacks', rand(30));
  setText('r-read', rand(60));
  setText('r-shit', rand(20));
  setText('r-sleep', rand(10));
}
updateStats();
setInterval(updateStats, 5 * 60 * 1000);

// Days skipped gym: starts at 5 on 2026-09-29 and goes up by 1 every day
function updateGym() {
  const start = new Date(2026, 8, 29);          // start day (month is 0-based)
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((today - start) / 864e5);
  setText('r-gym', 5 + Math.max(0, days));
}
updateGym();
setInterval(updateGym, 60 * 1000); // re-check every minute so it flips at midnight