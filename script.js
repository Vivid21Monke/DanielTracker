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

// Countdowns (year 2026, local time)
const targets = { 'cd-bday': new Date(2026, 9, 4), 'cd-party': new Date(2026, 9, 17) };
function updateCountdowns() {
  for (const id in targets) {
    const ms = targets[id] - Date.now();
    if (ms <= 0) { setText(id, Date.now() - targets[id] < 864e5 ? '🎉 Today!' : 'Done 🎉'); continue; }
    const t = Math.floor(ms / 1000), p = n => String(n).padStart(2, '0');
    setText(id, Math.floor(t / 86400) + 'd ' + p(Math.floor(t % 86400 / 3600)) + ':' + p(Math.floor(t % 3600 / 60)) + ':' + p(t % 60));
  }
}
updateCountdowns();
setInterval(updateCountdowns, 1000);

// ===== Progress bars (30-day window before each date) =====
function updateProgress() {
  [['bday', targets['cd-bday']], ['party', targets['cd-party']]].forEach(([k, t]) => {
    const start = t - 30 * 864e5;
    const p = Math.min(100, Math.max(0, (Date.now() - start) / (t - start) * 100));
    document.getElementById('pb-' + k).style.width = p + '%';
    setText('pl-' + k, Math.floor(p) + '% there · ' + t.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
  });
}
updateProgress();
setInterval(updateProgress, 60 * 1000);

// ===== Breaking news ticker =====
const gym = document.getElementById('r-gym').textContent;
const news = [
  'Daniel skips gym again (' + gym + ' days and counting)',
  'Sources confirm Daniel said "5 more minutes"... again',
  'Local man leaves messages on read, friends furious',
  'Daniel\'s football career remains a big "what if"',
  'Snack supplies at Daniel\'s place reported critically low',
  'Daniel declares Bench the greatest position in football',
  'Experts baffled: Daniel is still online',
  'Birthday countdown continues, gifts still pending'
];
const tk = document.getElementById('ticker');
const line = news.map(n => '<span><em>BREAKING</em>' + n + '</span>').join('');
tk.innerHTML = line + line;

// ===== Confetti + birthday / party banner =====
function confetti(ms = 8000) {
  const c = document.getElementById('confetti'), x = c.getContext('2d');
  c.width = innerWidth; c.height = innerHeight;
  const cols = ['#e5313a', '#ffffff', '#ffd166', '#4fbf7a', '#4aa3c8'];
  const ps = Array.from({ length: 160 }, () => ({
    x: Math.random() * c.width, y: -Math.random() * c.height, s: 4 + Math.random() * 6,
    v: 2 + Math.random() * 4, r: Math.random() * 6, vr: Math.random() * .2 - .1,
    c: cols[Math.floor(Math.random() * cols.length)]
  }));
  const end = Date.now() + ms;
  (function frame() {
    x.clearRect(0, 0, c.width, c.height);
    ps.forEach(p => {
      p.y += p.v; p.r += p.vr; p.x += Math.sin(p.r);
      if (p.y > c.height && Date.now() < end) p.y = -10;
      x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c;
      x.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); x.restore();
    });
    if (Date.now() < end || ps.some(p => p.y < c.height)) requestAnimationFrame(frame);
    else x.clearRect(0, 0, c.width, c.height);
  })();
}
function specialDay() {
  const h = location.hash, n = new Date();   // add #test-birthday or #test-party to the URL to preview
  if (h === '#test-birthday' || (n.getMonth() === 9 && n.getDate() === 4)) return '🎂 HAPPY BIRTHDAY DANIEL! 🎂';
  if (h === '#test-party' || (n.getMonth() === 9 && n.getDate() === 17)) return '🎉 IT\'S PARTY DAY! 🥳';
  return '';
}
const dayText = specialDay();
if (dayText) {
  document.getElementById('banner').hidden = false;
  setText('banner-text', dayText);
  document.getElementById('banner-btn').onclick = () => confetti();
  confetti();
}

// ===== Party playlist link (put your link here) =====
const PLAYLIST_URL = 'https://open.spotify.com/playlist/6Hr7x2OLXjdbqGyQ61ivrO?si=5yZZvF4ySbWOM2PRrvlXmg&utm_source=copy-link&pi=vhtaE9E4R_C7C';   // e.g. 'https://open.spotify.com/playlist/...'
if (PLAYLIST_URL) { document.getElementById('playlist-link').href = PLAYLIST_URL; }
else { setText('playlist-note', 'Link coming soon'); document.getElementById('playlist-link').onclick = e => e.preventDefault(); }